use tauri::command;

/// Trigger the physical door controller relay.
/// In production, this would connect to a Serial COM port or TCP socket
/// to send a relay trigger command (e.g., to an ESP32 or Access Control Board).
#[command]
pub async fn hardware_trigger_door() -> Result<(), String> {
    println!("==================================================");
    println!("🚪 [DOOR TRIGGER] Signal sent to door controller!");
    println!("==================================================");
    
    // Simulate relay delay
    tokio::time::sleep(std::time::Duration::from_millis(500)).await;
    
    Ok(())
}
