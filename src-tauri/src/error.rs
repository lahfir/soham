use thiserror::Error;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),
    
    #[error("Icon extraction error: {0}")]
    IconExtraction(String),
    
    #[error("Screenshot capture error: {0}")]
    Screenshot(String),
    
    #[error("System monitoring error: {0}")]
    SystemMonitoring(String),
    
    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),
    
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    
    #[error("Config error: {0}")]
    Config(String),
    
    #[error("Cache error: {0}")]
    Cache(String),
    
    #[error("Invalid input: {0}")]
    InvalidInput(String),
    
    #[error("Not found: {0}")]
    NotFound(String),
    
    #[error("File IO error: {0}")]
    FileIO(String),
    
    #[error("Image processing error: {0}")]
    ImageProcessing(String),
}

pub type Result<T> = std::result::Result<T, AppError>;

impl From<AppError> for String {
    fn from(err: AppError) -> Self {
        err.to_string()
    }
}