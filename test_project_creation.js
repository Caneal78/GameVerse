/**
 * Test the complete project creation and item creation flow
 * This simulates what happens when a user creates a project and adds an item
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

const vault = require('./electron/lib/vault');
const itemRepo = require('./electron/lib/itemRepo');

async function main() {
  console.log('=== TESTING PROJECT CREATION AND ITEM CREATION ===\n');
  
  // Create a temporary directory for testing
  const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gv-proj-test-'));
  console.log('Test directory:', testDir);
  
  try {
    // Step 1: Create a project (simulates user clicking "New Project")
    console.log('\n[1] Creating new project...');
    const projectName = 'TestProject_' + Date.now();
    const created = vault.createProject(testDir, projectName);
    console.log('✓ Project created at:', created.projectPath);
    console.log('✓ Database path:', created.dbPath);
    
    // Verify the database file exists
    if (!fs.existsSync(created.dbPath)) {
      throw new Error('Database file was not created!');
    }
    console.log('✓ Database file exists');
    
    // Step 2: Open the project (simulates the app opening the created project)
    console.log('\n[2] Opening project...');
    const opened = vault.openProject(created.projectPath);
    console.log('✓ Project opened');
    console.log('✓ Project name:', opened.projectName);
    console.log('✓ Database connection established');
    
    // Step 3: Create an item (simulates user creating an item in the UI)
    console.log('\n[3] Creating a test item...');
    const newItem = itemRepo.createItem(opened.db, {
      name: 'Test Character',
      category: 'Character',
      status: 'Concept',
      summary: 'A test character for verification',
      tags: ['Test', 'Hero'],
      fields: { age: '25', biography: 'Test biography' }
    });
    console.log('✓ Item created with ID:', newItem.id);
    console.log('✓ Item name:', newItem.name);
    console.log('✓ Item category:', newItem.category);
    
    // Step 4: Verify the item was saved
    console.log('\n[4] Verifying item was saved...');
    const retrievedItem = itemRepo.getItem(opened.db, newItem.id);
    if (!retrievedItem) {
      throw new Error('Item was not saved to database!');
    }
    console.log('✓ Item retrieved successfully');
    console.log('✓ Item has', retrievedItem.tags.length, 'tags');
    console.log('✓ Item has', retrievedItem.fields.length, 'fields');
    
    // Step 5: List all items
    console.log('\n[5] Listing all items...');
    const allItems = itemRepo.listItems(opened.db, {});
    console.log('✓ Total items in project:', allItems.length);
    
    // Close database
    opened.db.close();
    
    console.log('\n=== ✅ ALL TESTS PASSED ===');
    console.log('Project creation and item creation are working correctly!');
    
  } catch (error) {
    console.error('\n=== ❌ TEST FAILED ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    // Cleanup
    console.log('\nCleaning up test directory...');
    try {
      if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true });
        console.log('✓ Cleanup complete');
      }
    } catch (cleanupError) {
      console.warn('⚠ Cleanup warning:', cleanupError.message);
    }
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
