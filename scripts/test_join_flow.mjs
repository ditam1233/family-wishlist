import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hvnxspbltdmctugcsnmn.supabase.co';
const supabaseAnonKey = 'sb_publishable_eA3CdeXBbog9iS2sBETpuQ_wBIHRXIe';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testJoinByCode(inviteCode, name) {
  const cleanCode = inviteCode.trim().toUpperCase();
  const cleanName = name.trim();

  console.log('--- Testing joinByCode with:', cleanCode, cleanName);

  // 1. Check family_groups
  const { data: group, error: grpErr } = await supabase
    .from('family_groups')
    .select('*')
    .ilike('invite_code', cleanCode)
    .maybeSingle();

  if (grpErr || !group) {
    console.error('Step 1 Failed:', grpErr || 'Group not found');
    return;
  }
  console.log('Step 1 Success, found group:', group.name, group.id);

  // 2. Sign up anonymous relative
  const safeCode = cleanCode.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'fam';
  const randomSuffix = Math.random().toString(36).slice(2, 8);
  const generatedEmail = `${safeCode}_${randomSuffix}@family.local`;
  const generatedPassword = `pwd_${safeCode}_${Date.now()}`;

  const { data: authData, error: authErr } = await supabase.auth.signUp({
    email: generatedEmail,
    password: generatedPassword,
    options: {
      data: { name: cleanName },
    },
  });

  if (authErr || !authData.user) {
    console.error('Step 2 Failed auth:', authErr);
    return;
  }
  console.log('Step 2 Success, user created:', authData.user.id, generatedEmail);

  // 3. Profiles upsert
  const { error: profErr } = await supabase.from('profiles').upsert({
    id: authData.user.id,
    name: cleanName,
    email: generatedEmail,
  });
  if (profErr) {
    console.warn('Step 3 Profiles upsert error:', profErr.message);
  } else {
    console.log('Step 3 Profiles upsert success');
  }

  // 4. Join group
  const { error: memErr } = await supabase.from('group_members').insert({
    group_id: group.id,
    user_id: authData.user.id,
  });
  if (memErr) {
    console.error('Step 4 Group members insert error:', memErr);
  } else {
    console.log('Step 4 Group members insert success!');
  }
}

testJoinByCode('ФЭМ-3031', 'Бабушка').catch(console.error);
