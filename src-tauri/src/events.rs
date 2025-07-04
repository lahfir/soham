use std::sync::Arc;
use serde::Deserialize;
use tauri::{AppHandle, Emitter};
use chrono::{DateTime, Utc};
use crate::db::Db;
use futures::StreamExt;

#[derive(Deserialize, Debug, PartialEq, Eq)]
pub enum EventType {
    #[serde(rename = "focused")]
    Focused,
    #[serde(rename = "unfocused")]
    Unfocused,
}

impl ToString for EventType {
    fn to_string(&self) -> String {
        match self {
            EventType::Focused => "focused".to_string(),
            EventType::Unfocused => "unfocused".to_string(),
        }
    }
}

#[derive(Deserialize, Debug, Clone, serde::Serialize)]
pub struct Payload {
    pub app: String,
    pub window_title: String,
    pub pid: i32,
    pub path: String,
}

#[derive(Deserialize, Debug)]
pub struct EventData {
    pub id: i32,
    #[serde(rename = "type")]
    pub r#type: EventType,
    pub timestamp: DateTime<Utc>,
    pub payload: Payload,
}

pub struct EventPoller;

impl EventPoller {
    pub fn spawn(db: Arc<Db>, app: AppHandle) {
        std::thread::spawn(move || {
            let rt = tokio::runtime::Runtime::new().unwrap();
            rt.block_on(async {
                let client = match eventsource_client::Client::for_url("http://localhost:5600/events") {
                    Ok(builder) => builder.build_http(),
                    Err(e) => {
                        let _ = db.insert_audit("error", &format!("failed to create event source client: {:?}", e));
                        return;
                    }
                };
                let mut stream = Box::pin(client.stream());

                loop {
                    match stream.next().await {
                        Some(Ok(event)) => {
                            if event.event_type == "message" {
                                if let Some(data) = event.field("data") {
                                    if let Ok(raw) = std::str::from_utf8(data) {
                                        if let Err(e) = Self::step(&db, &app, raw) {
                                            let _ = db.insert_audit("error", &format!("event poller error: {:?}", e));
                                        }
                                    }
                                }
                            }
                        }
                        Some(Err(e)) => {
                           let _ = db.insert_audit("error", &format!("human-watch-rs sse error: {:?}", e));
                        }
                        _ => {}
                    }
                }
            })
        });
    }

    fn step(db: &Arc<Db>, app: &AppHandle, raw: &str) -> anyhow::Result<()> {
        let event: EventData = serde_json::from_str(raw)?;
        let ts = event.timestamp.timestamp();
        let _ = db.insert_window_event(
            ts,
            &event.r#type.to_string(),
            &event.payload.window_title,
            &event.payload.app,
            event.payload.pid,
        )?;

        if event.r#type == EventType::Focused {
            let _ = app.emit("new-activity", event.payload);
        }

        Ok(())
    }
} 