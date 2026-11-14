/**
 * สคริปต์ตรวจสอบสถานะการเชื่อมต่อระหว่าง Cloudflare Worker, Supabase, และ LINE
 * ใช้งาน: node test-connection.js
 */

const WORKER_URL = 'https://line-leave-relay.finnlution.workers.dev';

async function checkHealth() {
  console.log('======================================================');
  console.log(' ตรวจสอบการเชื่อมต่อระบบลางาน (Cloudflare + Supabase + LINE)');
  console.log('======================================================\n');
  console.log(`🌐 กำลังทดสอบเรียก Worker endpoint: ${WORKER_URL}/ping ...`);

  try {
    const res = await fetch(`${WORKER_URL}/ping`);
    if (!res.ok) {
      throw new Error(`Worker ตอบกลับด้วย HTTP Status: ${res.status}`);
    }
    const data = await res.json();
    console.log('\nผลการตรวจสอบ:');
    console.log('------------------------------------------------------');
    console.log(`สถานะ Worker          : ${data.status === 'ok' ? '✅ ทำงานปกติ (ONLINE)' : '❌ ผิดปกติ'}`);
    console.log(`เชื่อมต่อ Supabase     : ${data.supabaseConnected ? '✅ สำเร็จ (CONNECTED)' : '❌ ไม่สามารถเชื่อมต่อได้'}`);
    console.log(`LINE Channel Secret   : ${data.hasChannelSecret ? '✅ มีการตั้งค่าแล้ว' : '❌ ยังไม่ได้ตั้งค่า'}`);
    console.log(`LINE Access Token     : ${data.hasChannelAccessToken ? '✅ มีการตั้งค่าแล้ว' : '❌ ยังไม่ได้ตั้งค่า'}`);
    console.log(`เวลาตอบกลับ (UTC)     : ${data.time}`);
    console.log('------------------------------------------------------');

    if (data.status === 'ok' && data.supabaseConnected && data.hasChannelSecret && data.hasChannelAccessToken) {
      console.log('\n🎉 สรุป: ระบบพร้อมใช้งาน การเชื่อมต่อ Cloudflare Worker, Supabase และ LINE สมบูรณ์ 100%');
    } else {
      console.log('\n⚠️ ข้อควรระวัง: ยังมีบางส่วนที่ยังไม่ได้ตั้งค่าอย่างสมบูรณ์ กรุณาตรวจสอบค่า Environment Variables');
    }
  } catch (error) {
    console.error('\n❌ เกิดข้อผิดพลาดในการเชื่อมต่อ:', error.message);
  }
}

checkHealth();
