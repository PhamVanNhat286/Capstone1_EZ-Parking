import test from 'node:test';
import assert from 'node:assert/strict';
import { avatarFileError, demoPasswordError, endDemoSession, initialAccount, initialDemoSessions, profileInitials, validateAccountProfile } from './account-settings.ts';

test('profile validation normalizes name and validates Vietnamese phone numbers without changing fixed email',()=>{
  const result=validateAccountProfile({...initialAccount,name:'  Nguyễn   Minh  ',phone:'+84 905 123 456'});
  assert.deepEqual(result.errors,{});
  assert.equal(result.value.name,'Nguyễn Minh');
  assert.equal(result.value.email,initialAccount.email);
  assert.equal(validateAccountProfile({...initialAccount,name:' ',phone:'123'}).errors.name,'Nhập họ tên từ 2 đến 80 ký tự.');
  assert.ok(validateAccountProfile({...initialAccount,phone:'123'}).errors.phone);
  assert.deepEqual(validateAccountProfile(initialAccount).errors,{});
  assert.equal(initialAccount.name,'Minh Trần');
});

test('avatar controls reject unsupported, empty and oversized files while accepting the exact 2MB boundary',()=>{
  assert.equal(avatarFileError({type:'image/png',size:2*1024*1024}),'');
  assert.equal(avatarFileError({type:'image/jpeg',size:1}),'');
  for(const file of [{type:'image/svg+xml',size:20},{type:'image/png',size:0},{type:'image/png',size:2*1024*1024+1}])assert.ok(avatarFileError(file));
  assert.equal(profileInitials('Minh Trần'),'MT');
  assert.equal(profileInitials('  Đặng Minh An '),'ĐA');
});

test('password prototype validates confirmation and never changes input or persists credentials',()=>{
  assert.ok(demoPasswordError('','DemoNew123!','DemoNew123!'));
  assert.ok(demoPasswordError('DemoOld123!','short','short'));
  assert.ok(demoPasswordError('DemoOld123!','DemoOld123!','DemoOld123!'));
  assert.ok(demoPasswordError('DemoOld123!','DemoNew123!','different'));
  assert.equal(demoPasswordError('DemoOld123!','DemoNew123!','DemoNew123!'),'');
});

test('ending a demo session preserves the current device and the original session list',()=>{
  assert.equal(endDemoSession(initialDemoSessions,'current').length,2);
  const next=endDemoSession(initialDemoSessions,'mobile');
  assert.equal(next.length,1);
  assert.equal(next[0].current,true);
  assert.equal(initialDemoSessions.length,2);
});
