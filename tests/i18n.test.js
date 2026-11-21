const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const I18n=require('../i18n.js');

test('ru and en dictionaries have the same keys',()=>{
 assert.deepEqual(Object.keys(I18n.TEXT.ru).sort(),Object.keys(I18n.TEXT.en).sort());
});

test('cause codes and notices are localized',()=>{
 for(const code of ['fall','spikes','laser','mine']){
  assert.ok(I18n.cause('ru',code));
  assert.ok(I18n.cause('en',code));
  assert.notEqual(I18n.cause('ru',code),code);
  assert.notEqual(I18n.cause('en',code),code);
 }
 assert.match(I18n.notice('ru',{key:'levelUp',level:3}),/3/);
 assert.match(I18n.notice('en',{key:'levelUp',level:3}),/3/);
 assert.notEqual(I18n.notice('ru',{key:'levelUp',level:3}),I18n.notice('en',{key:'levelUp',level:3}));
});

test('missing keys and language normalization are safe',()=>{
 assert.equal(I18n.t('en','missingKey'),'missingKey');
 assert.equal(I18n.normalize('ru-RU'),'ru');
 assert.equal(I18n.normalize('en-US'),'en');
 assert.equal(I18n.normalize('tr-TR'),'en');
});

test('all data-i18n keys used by index.html exist in both dictionaries',()=>{
 const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
 const keys=new Set();
 for(const match of html.matchAll(/data-i18n(?:-(?:html|aria|title))?="([^"]+)"/g))keys.add(match[1]);
 assert.ok(keys.size>0);
 for(const key of keys){
  assert.ok(Object.prototype.hasOwnProperty.call(I18n.TEXT.ru,key),`missing ru key: ${key}`);
  assert.ok(Object.prototype.hasOwnProperty.call(I18n.TEXT.en,key),`missing en key: ${key}`);
 }
});
