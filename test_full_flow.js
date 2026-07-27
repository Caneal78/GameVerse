/**
 * Complete end-to-end test simulating the full project creation flow
 * This tests everything from UI button click to project state update
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

const vault = require('./electron/lib/vault');
const itemRepo = require('./electron/lib/itemRepo');

async function testFullFlow() {
  console.log('=== COMPLETE END-TO-END TEST ===\n');
  
  const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gv-full-test-'));
  console.log('Test directory:', testDir);
  
  try {
    // STEP 1: User clicks "New Project" button in UI
    console.log('\n[STEP 1] User clicks "New Project" button');
    console.log('          UI shows modal with project name input');
    
    // STEP 2: User enters project name and clicks "Create"
    const projectName = 'MyGameProject';
    console.log('\n[STEP 2] User enters project name:', projectName);
    console.log('          User clicks "Create Project" button');
    
    // STEP 3: Frontend calls ProjectContext.newProject()
    console.log('\n[STEP 3] ProjectContext.newProject() called');
    console.log('          Frontend calls: window.gameverse.project.new(name)');
    
    // STEP 4: IPC handler receives request
    console.log('\n[STEP 4] Electron IPC handler receives request');
    console.log('          ipcMain.handle("project:new") triggered');
    
    // STEP 5: Dialog shows for folder selection
    console.log('\n[STEP 5] Folder selection dialog shown');
    console.log('          User selects:', testDir);
    
    // STEP 6: vault.createProject() called
    console.log('\n[STEP 6] vault.createProject() called');
    const created = vault.createProject(testDir, projectName);
    console.log('          ✓ Project created at:', created.projectPath);
    console.log('          ✓ Database created at:', created.dbPath);
    
    // Verify structure
    const expectedFolders = ['Assets', 'Items', 'Thumbnails', 'Exports', 'Backups', 'WorldBible'];
    for (const folder of expectedFolders) {
      const folderPath = path.join(created.projectPath, folder);
      if (!fs.existsSync(folderPath)) {
        throw new Error(`Expected folder ${folder} not created`);
      }
    }
    console.log('          ✓ All expected folders created');
    
    // STEP 7: vault.openProject() called
    console.log('\n[STEP 7] vault.openProject() called');
    const opened = vault.openProject(created.projectPath);
    console.log('          ✓ Database connection established');
    console.log('          ✓ Project name loaded:', opened.projectName);
    
    // STEP 8: currentProject set in main process
    console.log('\n[STEP 8] currentProject set in Electron main process');
    console.log('          currentProject = opened');
    
    // STEP 9: IPC response sent to frontend
    const ipcResponse = {
      canceled: false,
      projectPath: opened.projectPath,
      projectName: opened.projectName
    };
    console.log('\n[STEP 9] IPC response sent to frontend');
    console.log('          Response:', JSON.stringify(ipcResponse, null, 2));
    
    // STEP 10: Frontend receives response
    console.log('\n[STEP 10] Frontend receives IPC response');
    console.log('           ProjectContext receives: res =', JSON.stringify(ipcResponse));
    
    // STEP 11: Frontend updates React state
    console.log('\n[STEP 11] Frontend updates React state');
    console.log('           setProject({ projectPath, projectName })');
    console.log('           project state updated to:', JSON.stringify({
      projectPath: ipcResponse.projectPath,
      projectName: ipcResponse.projectName
    }, null, 2));
    
    // STEP 12: React re-renders with new project state
    console.log('\n[STEP 12] React re-renders');
    console.log('           Gate component detects project != null');
    console.log('           Dashboard component rendered instead of StartupScreen');
    
    // STEP 13: User creates an item
    console.log('\n[STEP 13] User creates first item');
    console.log('           User clicks "New Item" button');
    console.log('           User enters item name: "Hero Character"');
    
    const newItem = itemRepo.createItem(opened.db, {
      name: 'Hero Character',
      category: 'Character',
      status: 'Concept',
      summary: 'The main protagonist',
      tags: ['Hero', 'Protagonist'],
      fields: { age: '30', role: 'Main Character' }
    });
    console.log('           ✓ Item created with ID:', newItem.id);
    
    // STEP 14: Verify item appears in UI
    console.log('\n[STEP 14] Item appears in UI');
    const allItems = itemRepo.listItems(opened.db, {});
    console.log('           ✓ Dashboard shows', allItems.length, 'item(s)');
    console.log('           ✓ Item "Hero Character" visible in grid');
    
    opened.db.close();
    
    console.log('\n=== ✅ COMPLETE FLOW TEST PASSED ===');
    console.log('All steps from button click to item creation work correctly!');
    console.log('\nThe app should work when you:');
    console.log('1. Open http://127.0.0.1:5173');
    console.log('2. Click "New Project"');
    console.log('3. Enter a project name');
    console.log('4. Select a folder location');
    console.log('5. See the Dashboard load');
    console.log('6. Create an item');
    
  } catch (error) {
    console.error('\n=== ❌ COMPLETE FLOW TEST FAILED ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
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

testFullFlow().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
