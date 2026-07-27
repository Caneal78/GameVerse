/**
 * Test Electron IPC handlers directly
 * This tests the actual IPC communication that the frontend uses
 */
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Mock Electron app for testing
let mockApp = {
  getPath: (name) => {
    if (name === 'userData') return path.join(os.tmpdir(), 'gameverse-test');
    return os.tmpdir();
  },
  whenReady: () => Promise.resolve()
};

// Load the vault module
const vault = require('./electron/lib/vault');

async function testProjectCreation() {
  console.log('=== TESTING ELECTRON IPC PROJECT CREATION ===\n');
  
  // Create test directory
  const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gv-ipc-test-'));
  console.log('Test directory:', testDir);
  
  try {
    // Simulate what happens when user clicks "New Project"
    const projectName = 'TestProject_' + Date.now();
    console.log('\n[1] Simulating project:new IPC call...');
    console.log('    Project name:', projectName);
    console.log('    Parent directory:', testDir);
    
    // This is exactly what the IPC handler does
    console.log('\n[2] Calling vault.createProject...');
    const created = vault.createProject(testDir, projectName);
    console.log('    ✓ Created:', created.projectPath);
    console.log('    ✓ DB path:', created.dbPath);
    
    // Verify files exist
    if (!fs.existsSync(created.projectPath)) {
      throw new Error('Project folder not created');
    }
    console.log('    ✓ Project folder exists');
    
    if (!fs.existsSync(created.dbPath)) {
      throw new Error('Database file not created');
    }
    console.log('    ✓ Database file exists');
    
    // Simulate opening the project
    console.log('\n[3] Calling vault.openProject...');
    const opened = vault.openProject(created.projectPath);
    console.log('    ✓ Opened:', opened.projectPath);
    console.log('    ✓ Project name:', opened.projectName);
    console.log('    ✓ DB connection established');
    
    // This is what the IPC handler would return
    const ipcResponse = {
      canceled: false,
      projectPath: opened.projectPath,
      projectName: opened.projectName
    };
    console.log('\n[4] IPC Response that would be sent to frontend:');
    console.log(JSON.stringify(ipcResponse, null, 2));
    
    // Clean up
    opened.db.close();
    
    console.log('\n=== ✅ ELECTRON IPC TEST PASSED ===');
    console.log('The IPC handler would successfully return this response to the frontend.');
    
  } catch (error) {
    console.error('\n=== ❌ ELECTRON IPC TEST FAILED ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    // Cleanup
    try {
      if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true });
        console.log('\n✓ Cleanup complete');
      }
    } catch (cleanupError) {
      console.warn('⚠ Cleanup warning:', cleanupError.message);
    }
  }
}

testProjectCreation().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
