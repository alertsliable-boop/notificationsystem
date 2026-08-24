const LOCAL_URL = 'https://notificationsystem-nine.vercel.app';
// If you don't have INBOUND_WEBHOOK_SECRET in your .env.local, we assume it's undefined
// For testing locally without setting it, you can pass 'undefined' string or temporarily disable the check.
// It's highly recommended to add INBOUND_WEBHOOK_SECRET="your-secret-here" to .env.local
const SECRET = process.env.INBOUND_WEBHOOK_SECRET || 'test-secret';

async function testWebhook(toEmail) {
  const payload = {
    type: 'email.received',
    data: {
      to: [toEmail],
      from: 'test-sender@example.com',
      subject: 'CRITICAL ALERT: Test Issue',
      text: 'This is a test notification from the test script.',
      html: '<p>This is a <strong>test notification</strong> from the test script.</p>',
      headers: {
        'Message-ID': `<test-id-${Date.now()}@example.com>`
      }
    }
  };

  console.log(`Sending simulated inbound email to: ${toEmail}`);
  console.log(`Webhook URL: ${LOCAL_URL}/api/webhooks/inbound-email?secret=${SECRET}`);

  try {
    const res = await fetch(`${LOCAL_URL}/api/webhooks/inbound-email?secret=${SECRET}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await res.text();
    console.log(`\nStatus: ${res.status}`);
    console.log(`Response: ${result}`);

    if (res.ok) {
      console.log('✅ Webhook received by the server! Check your database/logs to see if the notification was processed and SMS was queued.');
    } else if (res.status === 401) {
      console.log('❌ Unauthorized! Ensure INBOUND_WEBHOOK_SECRET in .env.local matches the secret used in this script.');
      console.log('Fix: Add INBOUND_WEBHOOK_SECRET="test-secret" to your .env.local file, restart the Next.js server, and try again.');
    } else {
      console.log('❌ Request failed.');
    }
  } catch (err) {
    console.error('Error sending request. Is your Next.js server running on port 3000?');
    console.error(err.message);
  }
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('Usage: node test-webhook.js <endpoint-email-address>');
  console.log('Example: node test-webhook.js custom-label-xyz@mail.liablealerts.com');
  process.exit(1);
}

testWebhook(args[0]);
