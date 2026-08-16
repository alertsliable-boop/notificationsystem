// Test script to send a real SMS using the configured Twilio credentials
// Usage: node --env-file=.env test-sms.js <recipient_phone_number>
// Example: node --env-file=.env test-sms.js +12345678901

const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const apiKey = process.env.TWILIO_API_KEY;
const apiSecret = process.env.TWILIO_API_SECRET;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

if (!accountSid) {
  console.error('❌ Error: TWILIO_ACCOUNT_SID is missing in .env');
  process.exit(1);
}

if (!fromNumber) {
  console.error('❌ Error: TWILIO_PHONE_NUMBER is missing in .env');
  process.exit(1);
}

let client;
if (apiKey && apiSecret) {
  client = twilio(apiKey, apiSecret, { accountSid });
} else if (authToken) {
  client = twilio(accountSid, authToken);
} else {
  console.error('❌ Error: Either (TWILIO_API_KEY & TWILIO_API_SECRET) or TWILIO_AUTH_TOKEN must be set.');
  process.exit(1);
}

const targetPhone = process.argv[2];

if (!targetPhone) {
  console.log('----------------------------------------------------');
  console.log(' Twilio Configuration Test');
  console.log('----------------------------------------------------');
  console.log(` Account SID: ${accountSid}`);
  console.log(` From Number: ${fromNumber}`);
  console.log(' Fetching account details from Twilio API...\n');

  client.api.v2010.accounts(accountSid).fetch()
    .then((acc) => {
      console.log('✅ Twilio Connection Successful!');
      console.log(`   Account Name   : ${acc.friendlyName}`);
      console.log(`   Account Status : ${acc.status}`);
      console.log('\n💡 To send a test SMS to your phone, run:');
      console.log('   node --env-file=.env test-sms.js +1XXXXXXXXXX');
      console.log('   (replace +1XXXXXXXXXX with your actual mobile number)\n');
    })
    .catch((err) => {
      console.error('❌ Twilio API Error:', err.message);
    });
} else {
  console.log(`📤 Sending test SMS from ${fromNumber} to ${targetPhone}...`);

  client.messages.create({
    from: fromNumber,
    to: targetPhone,
    body: '🚨 Test message from Liable Alerts! Twilio SMS integration is working successfully.',
  })
  .then((message) => {
    console.log('✅ SMS Sent Successfully!');
    console.log(`   Message SID : ${message.sid}`);
    console.log(`   Status      : ${message.status}`);
    console.log(`   To          : ${message.to}`);
    console.log(`   From        : ${message.from}`);
  })
  .catch((err) => {
    console.error('❌ Failed to send SMS:', err.message);
    if (err.code === 21608) {
      console.error('\n⚠️ Note (Twilio Trial Account): In a trial account, recipient numbers must be verified in the Twilio Console before sending.');
    } else if (err.code === 21614 || err.code === 30008) {
      console.error('\n⚠️ Note (A2P 10DLC): Ensure your A2P campaign or phone number sender setup is completed.');
    }
  });
}
