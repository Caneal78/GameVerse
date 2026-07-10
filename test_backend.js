/**
 * Headless functional test of the GameVerse core backend logic
 * (vault creation, item CRUD, tags, notes, files, links, collections,
 * world bible, search, export, backup) without launching Electron's
 * BrowserWindow (no display needed).
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

const vault = require('./electron/lib/vault');
const itemRepo = require('./electron/lib/itemRepo');
const filesLib = require('./electron/lib/files');
const { search } = require('./electron/lib/searchIndex');
const { exportItem } = require('./electron/lib/exportItem');
const { createBackup } = require('./electron/lib/backup');

function assert(cond, msg) {
  if (!cond) throw new Error('ASSERTION FAILED: ' + msg);
  console.log('  ok - ' + msg);
}

async function main() {
  const tmpParent = fs.mkdtempSync(path.join(os.tmpdir(), 'gv-test-'));
  console.log('Test workspace:', tmpParent);

  // 1. Create project
  console.log('\n[1] Create project vault');
  const created = vault.createProject(tmpParent, 'City vs Country');
  assert(fs.existsSync(created.projectPath), 'project folder exists');
  assert(fs.existsSync(path.join(created.projectPath, 'GameVerse.db')), 'GameVerse.db exists');
  assert(fs.existsSync(path.join(created.projectPath, 'Assets/Characters')), 'Assets/Characters exists');
  assert(fs.existsSync(path.join(created.projectPath, 'WorldBible/Lore')), 'WorldBible/Lore exists');

  // 2. Open project
  console.log('\n[2] Open project');
  const opened = vault.openProject(created.projectPath);
  const db = opened.db;
  assert(opened.projectName === 'City vs Country', 'project name loaded from meta');

  // 3. Templates seeded
  console.log('\n[3] Templates seeded');
  const templates = itemRepo.listTemplates(db);
  assert(templates.length > 0, 'default templates exist');
  assert(templates.some((t) => t.category === 'Character'), 'Character template exists');

  // 4. Create items
  console.log('\n[4] Create items + tags + fields');
  const vance = itemRepo.createItem(db, {
    name: 'Vance',
    category: 'Character',
    status: 'WIP',
    summary: 'Farm boy turned hero',
    tags: ['Hero', 'Human', 'Country'],
    fields: { age: '24', biography: 'Vance grew up on a small farm...' }
  });
  assert(vance.name === 'Vance', 'Vance created');
  assert(vance.tags.length === 3, 'Vance has 3 tags');
  assert(vance.fields.find((f) => f.field_key === 'age').field_value === '24', 'age field saved');

  const farmhouse = itemRepo.createItem(db, {
    name: 'Farmhouse',
    category: 'Location',
    status: 'Final',
    tags: ['Country', 'Home']
  });

  const spider = itemRepo.createItem(db, {
    name: 'Swamp Spider',
    category: 'Creature',
    status: 'Concept',
    tags: ['Swamp', 'Monster'],
    fields: { habitat: 'Swamp', species: 'Arachnid' }
  });
  assert(spider.name === 'Swamp Spider', 'Swamp Spider created');

  // 5. List/filter items
  console.log('\n[5] List + filter items');
  const allItems = itemRepo.listItems(db, {});
  assert(allItems.length === 3, 'listItems returns all 3 items');
  const characters = itemRepo.listItems(db, { category: 'Character' });
  assert(characters.length === 1, 'filter by category=Character returns 1');
  const countryTagged = itemRepo.listItems(db, { tag: 'Country' });
  assert(countryTagged.length === 2, 'filter by tag=Country returns 2 (Vance + Farmhouse)');

  // 6. Notes / notebook
  console.log('\n[6] Notebook entries');
  itemRepo.addNote(db, vance.id, {
    title: 'Vance Biography',
    note_type: 'Biography',
    body: 'Vance grew up in the countryside, dreaming of adventure beyond the farm.'
  });
  const vanceFull = itemRepo.getItem(db, vance.id);
  assert(vanceFull.notes.length === 1, 'note added to Vance');

  // 7. Links
  console.log('\n[7] Linking items');
  itemRepo.linkItems(db, vance.id, farmhouse.id, 'Located In');
  const vanceWithLinks = itemRepo.getItem(db, vance.id);
  assert(vanceWithLinks.links.length === 1, 'Vance linked to Farmhouse');
  assert(vanceWithLinks.links[0].item.name === 'Farmhouse', 'link resolves to Farmhouse');

  // 8. File import (create a dummy source file to import)
  console.log('\n[8] File import + versioning');
  const sourceDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gv-src-'));
  const dummyImagePath = path.join(sourceDir, 'vance_concept.png');
  fs.writeFileSync(dummyImagePath, Buffer.from([137, 80, 78, 71])); // fake PNG bytes
  const importedFile = filesLib.importFile(db, opened.projectPath, vance, 'Images', dummyImagePath, 'copy');
  assert(importedFile.version === 1, 'first import is version 1');
  assert(fs.existsSync(path.join(opened.projectPath, importedFile.stored_path)), 'imported file copied into vault');

  // Import "same" filename again -> should become version 2
  fs.writeFileSync(dummyImagePath, Buffer.from([137, 80, 78, 71, 13, 10])); // slightly different content
  const importedFile2 = filesLib.importFile(db, opened.projectPath, vance, 'Images', dummyImagePath, 'copy');
  assert(importedFile2.version === 2, 'second import of same filename is version 2');

  const vanceWithFiles = itemRepo.getItem(db, vance.id);
  const currentImages = vanceWithFiles.files.filter((f) => f.section === 'Images' && f.is_current);
  assert(currentImages.length === 1, 'only 1 current image file (v2)');
  assert(currentImages[0].version === 2, 'current image is v2');

  // Restore v1
  filesLib.restoreVersion(db, importedFile.id);
  const vanceAfterRestore = itemRepo.getItem(db, vance.id);
  const currentAfterRestore = vanceAfterRestore.files.filter((f) => f.section === 'Images' && f.is_current);
  assert(currentAfterRestore[0].version === 1, 'restored to v1 successfully');

  // 9. Full text search
  console.log('\n[9] Full text search (FTS5)');
  const swampResults = search(db, 'Swamp');
  assert(swampResults.length >= 1, 'search "Swamp" finds Swamp Spider');
  assert(swampResults.some((r) => r.name === 'Swamp Spider'), 'Swamp Spider is in search results');

  const bioResults = search(db, 'countryside');
  assert(bioResults.some((r) => r.name === 'Vance'), 'search "countryside" finds Vance via notebook text');

  // 10. Collections
  console.log('\n[10] Collections');
  const collection = itemRepo.createCollection(db, 'Swamp Biome', 'Everything swamp-related');
  itemRepo.addItemToCollection(db, collection.id, spider.id);
  const collectionFull = itemRepo.getCollection(db, collection.id);
  assert(collectionFull.items.length === 1, 'collection has 1 item');

  // 11. World Bible
  console.log('\n[11] World Bible pages');
  const wbPage = itemRepo.createWorldBiblePage(db, {
    category: 'Lore',
    title: 'The Great Divide',
    body: 'Long ago, City and Country were one nation...'
  });
  const wbPages = itemRepo.listWorldBiblePages(db, 'Lore');
  assert(wbPages.length === 1, 'world bible page created');
  assert(wbPages[0].title === 'The Great Divide', 'world bible page title correct');

  // 12. Export
  console.log('\n[12] Export item');
  const exportResult = exportItem(db, opened.projectPath, vance.id);
  assert(fs.existsSync(exportResult.exportRoot), 'export folder created');
  assert(fs.existsSync(path.join(exportResult.exportRoot, 'Documentation', 'Vance.md')), 'documentation markdown generated');
  assert(fs.existsSync(path.join(exportResult.exportRoot, 'Images')), 'Images export folder exists');
  const docContent = fs.readFileSync(path.join(exportResult.exportRoot, 'Documentation', 'Vance.md'), 'utf-8');
  assert(docContent.includes('Vance grew up'), 'exported doc contains notebook content');

  // 13. Backup
  console.log('\n[13] Backup system');
  const backupResult = await createBackup(db, opened.projectPath);
  assert(fs.existsSync(backupResult.backupPath), 'backup zip file created');
  assert(backupResult.size > 0, 'backup has non-zero size');

  // 14. Delete item cascades
  console.log('\n[14] Delete item cascades correctly');
  itemRepo.deleteItem(db, farmhouse.id);
  const remaining = itemRepo.listItems(db, {});
  assert(remaining.length === 2, 'item deleted, 2 remain');
  const vanceAfterDelete = itemRepo.getItem(db, vance.id);
  assert(vanceAfterDelete.links.length === 0, 'link to deleted Farmhouse removed via cascade');

  db.close();

  console.log('\n✅ ALL BACKEND TESTS PASSED');
  console.log('\nCleaning up test directories...');
  fs.rmSync(tmpParent, { recursive: true, force: true });
  fs.rmSync(sourceDir, { recursive: true, force: true });
}

main().catch((e) => {
  console.error('\n❌ TEST FAILED:', e);
  process.exit(1);
});
