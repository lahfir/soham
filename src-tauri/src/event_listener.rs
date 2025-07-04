// This module is responsible for setting up an OS-level event listener for
// real-time app activation events, providing a more efficient alternative
// to polling for the active window.

#![cfg(target_os = "macos")]
#![allow(unexpected_cfgs)]

use cocoa::base::{id, nil};
use cocoa::foundation::{NSAutoreleasePool, NSString};
use objc::runtime::{Class, Object, Sel};
use objc::{class, msg_send, sel, sel_impl};
use std::os::raw::c_void;
use std::sync::{Arc, Mutex};
use tauri::{AppHandle};
use std::thread;

use crate::state::AppState;
use crate::events::handle_new_activity;

// A struct to hold the state that the Objective-C object will need.
// We'll pass a pointer to this struct as an instance variable.
struct ObserverState {
    app_handle: AppHandle,
    app_state: AppState,
    last_active_app: Mutex<Option<String>>,
    last_switch_time: Mutex<Option<chrono::DateTime<chrono::Utc>>>,
}

// Spawns a new thread to set up and run the Cocoa event listener.
pub fn spawn(app_state: AppState, app_handle: AppHandle) {
    println!("🚀 Starting real-time macOS event listener...");
    
    let observer_state = Arc::new(ObserverState {
        app_handle,
        app_state,
        last_active_app: Mutex::new(None),
        last_switch_time: Mutex::new(None),
    });

    thread::spawn(move || {
        unsafe {
            let _pool = NSAutoreleasePool::new(nil);

            let nsobject_class = class!(NSObject);
            let decl = Class::get("SohamWorkspaceObserver").unwrap_or_else(|| {
                let mut decl = objc::declare::ClassDecl::new("SohamWorkspaceObserver", nsobject_class).unwrap();
                
                decl.add_ivar::<*const c_void>("_state");

                extern "C" fn on_app_activated(this: &mut Object, _cmd: Sel, notification: id) {
                    unsafe {
                        let state_ptr = *this.get_ivar::<*const c_void>("_state") as *const ObserverState;
                        if state_ptr.is_null() { return; }
                        let state = &*state_ptr;

                        let user_info: id = msg_send![notification, userInfo];
                        let running_app: id = msg_send![user_info, objectForKey: NSString::alloc(nil).init_str("NSWorkspaceApplicationKey")];
                        
                        if running_app == nil { return; }

                        let bundle_id: id = msg_send![running_app, bundleIdentifier];
                        let app_name: id = msg_send![running_app, localizedName];

                        if app_name == nil { return; }
                        
                        let app_name_str = nsstring_to_string(app_name);

                        // If it's our own app, ignore it to prevent feedback loops
                        if let Some(id) = nsstring_to_string_option(bundle_id) {
                            if id == "com.soham.dev" { return; }
                        }
                        
                        let pid: i64 = msg_send![running_app, processIdentifier];

                        // Handle the activity event
                        if let Err(e) = handle_new_activity(
                            &state.app_state, 
                            &state.app_handle,
                            app_name_str,
                            pid as i32,
                            &mut state.last_active_app.lock().unwrap(),
                            &mut state.last_switch_time.lock().unwrap(),
                        ) {
                            eprintln!("❌ Error handling new activity: {}", e);
                        }
                    }
                }
                
                extern "C" fn on_window_minimized(this: &mut Object, _cmd: Sel, notification: id) {
                    unsafe {
                        const EVENT_TYPE: &str = "minimize";
                        handle_window_event(this, notification, EVENT_TYPE);
                    }
                }

                extern "C" fn on_window_deminiaturized(this: &mut Object, _cmd: Sel, notification: id) {
                    unsafe {
                        const EVENT_TYPE: &str = "maximize";
                        handle_window_event(this, notification, EVENT_TYPE);
                    }
                }

                extern "C" fn on_window_closed(this: &mut Object, _cmd: Sel, notification: id) {
                    unsafe {
                        const EVENT_TYPE: &str = "close";
                        handle_window_event(this, notification, EVENT_TYPE);
                    }
                }

                decl.add_method(
                    sel!(onAppActivated:),
                    on_app_activated as extern "C" fn(&mut Object, Sel, id),
                );
                decl.add_method(
                    sel!(onWindowMinimized:),
                    on_window_minimized as extern "C" fn(&mut Object, Sel, id),
                );
                decl.add_method(
                    sel!(onWindowDeminiaturized:),
                    on_window_deminiaturized as extern "C" fn(&mut Object, Sel, id),
                );
                decl.add_method(
                    sel!(onWindowClosed:),
                    on_window_closed as extern "C" fn(&mut Object, Sel, id),
                );
                
                decl.register()
            });

            // Create an instance of our observer class
            let observer: id = msg_send![decl, new];
            
            // Store the pointer to our state within the Objective-C object
            let state_ptr = Arc::into_raw(observer_state) as *const c_void;
            (*observer).set_ivar("_state", state_ptr);

            // Get the shared workspace notification center
            let workspace: id = msg_send![class!(NSWorkspace), sharedWorkspace];
            let notification_center: id = msg_send![workspace, notificationCenter];

            // Add our observer for the app activation notification
            let notification_name = NSString::alloc(nil).init_str("NSWorkspaceDidActivateApplicationNotification");
            let _: () = msg_send![notification_center,
                addObserver: observer
                selector: sel!(onAppActivated:)
                name: notification_name
                object: nil
            ];
            
            // Listen for window minimize/maximize/close events via default center
            let default_center: id = msg_send![class!(NSNotificationCenter), defaultCenter];
            let minimize_name = NSString::alloc(nil).init_str("NSWindowDidMiniaturizeNotification");
            let demini_name = NSString::alloc(nil).init_str("NSWindowDidDeminiaturizeNotification");
            let close_name = NSString::alloc(nil).init_str("NSWindowWillCloseNotification");

            let _: () = msg_send![default_center,
                addObserver: observer
                selector: sel!(onWindowMinimized:)
                name: minimize_name
                object: nil
            ];
            let _: () = msg_send![default_center,
                addObserver: observer
                selector: sel!(onWindowDeminiaturized:)
                name: demini_name
                object: nil
            ];
            let _: () = msg_send![default_center,
                addObserver: observer
                selector: sel!(onWindowClosed:)
                name: close_name
                object: nil
            ];
            
            println!("✅ Real-time macOS event listener is active.");

            // Block this thread indefinitely by running the current run loop.
            let run_loop: id = msg_send![class!(NSRunLoop), currentRunLoop];
            let _: () = msg_send![run_loop, run];
        }
    });
}

// Helper to convert `NSString` to `String`
unsafe fn nsstring_to_string(ns_string: id) -> String {
    if ns_string == nil {
        return String::new();
    }
    let c_str: *const std::os::raw::c_char = msg_send![ns_string, UTF8String];
    if c_str.is_null() {
        return String::new();
    }
    std::ffi::CStr::from_ptr(c_str).to_string_lossy().into_owned()
}

// Helper to convert `NSString` to `Option<String>`
unsafe fn nsstring_to_string_option(ns_string: id) -> Option<String> {
    if nsstring_to_string(ns_string).is_empty() {
        return None;
    }
    Some(nsstring_to_string(ns_string))
}

// Helper shared by all window event callbacks.
unsafe fn handle_window_event(this: &mut Object, notification: id, event_type: &str) {
    use chrono::Utc;
    let state_ptr = *this.get_ivar::<*const c_void>("_state") as *const ObserverState;
    if state_ptr.is_null() { return; }
    let state = &*state_ptr;

    let window: id = msg_send![notification, object];
    if window == nil { return; }

    let title_ns: id = msg_send![window, title];
    let window_title = nsstring_to_string(title_ns);

    let ts = Utc::now().timestamp();
    let session_id = *state.app_state.current_session.lock().unwrap();

    if let Err(e) = state.app_state.db.insert_window_activity(
        session_id,
        ts,
        event_type,
        &window_title,
        "", // app_id not easily available here
        0,   // pid unknown in this context
    ) {
        eprintln!("❌ Failed to log window activity: {}", e);
    }
} 