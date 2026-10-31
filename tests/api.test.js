const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { app } = require('../src/server');
const memoryStore = require('../src/services/store');
const { detectStopsFromPoints, calculateTotalDistance } = require('../src/services/stopDetectionService');

test('Backend API Suite', async (t) => {
  let authToken = '';
  let activeSessionId = '';

  await t.test('1. Server Health Check returns 200', async () => {
    const res = await request(app).get('/api/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'UP');
  });

  await t.test('2. Staff Authentication - Login with valid credentials', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        identifier: 'EF-REC-104',
        password: 'Recovery@2026'
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.token);
    assert.strictEqual(res.body.staff.employeeId, 'EF-REC-104');
    authToken = res.body.token;
  });

  await t.test('3. Staff Authentication - Reject invalid password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        identifier: 'EF-REC-104',
        password: 'WrongPassword'
      });

    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.success, false);
  });

  await t.test('4. Fetch Staff Profile with Bearer token', async () => {
    const res = await request(app)
      .get('/api/v1/auth/profile')
      .set('Authorization', `Bearer ${authToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.staff.employeeId, 'EF-REC-104');
    assert.ok(res.body.staff.assignedArea);
  });

  await t.test('5. Fetch Assigned Cases with Search & Filter', async () => {
    const res = await request(app)
      .get('/api/v1/cases')
      .set('Authorization', `Bearer ${authToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(Array.isArray(res.body.cases));
    assert.ok(res.body.cases.length > 0);

    // Test search filter
    const searchRes = await request(app)
      .get('/api/v1/cases?search=Vikramaditya')
      .set('Authorization', `Bearer ${authToken}`);

    assert.strictEqual(searchRes.status, 200);
    assert.strictEqual(searchRes.body.cases.length, 1);
    assert.strictEqual(searchRes.body.cases[0].customer.name, 'Vikramaditya Roy');
  });

  await t.test('5b. Start Recovery without vehicle details is rejected', async () => {
    const res = await request(app)
      .post('/api/v1/recovery/start')
      .set('Authorization', 'Bearer ' + authToken)
      .send({ assignmentId: 'asgn_001', customerId: 'cust_001', loanId: 'loan_001' });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
  });

  await t.test('6. Recovery Session Lifecycle - Start Recovery', async () => {
    const res = await request(app)
      .post('/api/v1/recovery/start')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        assignmentId: 'asgn_001',
        customerId: 'cust_001',
        loanId: 'loan_001',
        vehicleType: 'BIKE',
        vehicleNumber: 'KA01AB1234',
        initialLocation: {
          latitude: 12.9716,
          longitude: 77.5946,
          accuracy: 10
        }
      });

    assert.ok([200, 201].includes(res.status));
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.session.sessionId);
    assert.strictEqual(res.body.session.status, 'ACTIVE');
    activeSessionId = res.body.session.sessionId;
  });

  await t.test('7. Record GPS Tracking Points for Session', async () => {
    const points = [
      { latitude: 12.9716, longitude: 77.5946, accuracy: 5, timestamp: new Date(Date.now() - 300000).toISOString() },
      { latitude: 12.9720, longitude: 77.5950, accuracy: 6, timestamp: new Date(Date.now() - 240000).toISOString() },
      { latitude: 12.9725, longitude: 77.5955, accuracy: 5, timestamp: new Date(Date.now() - 180000).toISOString() }
    ];

    const res = await request(app)
      .post(`/api/v1/recovery/sessions/${activeSessionId}/points`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        points,
        incrementalDistanceMeters: 250
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
  });

  await t.test('8. Record Detected Intermediate Stop', async () => {
    const res = await request(app)
      .post(`/api/v1/recovery/sessions/${activeSessionId}/stops`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        stopIndex: 1,
        startTime: new Date(Date.now() - 180000).toISOString(),
        endTime: new Date(Date.now() - 60000).toISOString(),
        durationSeconds: 120,
        latitude: 12.9725,
        longitude: 77.5955,
        placeName: 'MG Road Metro Station Area',
        address: 'MG Road, Bengaluru, Karnataka 560001'
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.stop.placeName, 'MG Road Metro Station Area');
  });

  await t.test('9. Update Session Outcome and Visit Notes', async () => {
    const res = await request(app)
      .patch(`/api/v1/recovery/sessions/${activeSessionId}/outcome`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        outcome: 'PAYMENT_COLLECTED',
        visitNotes: 'Customer made cash installment payment of ₹12,000.',
        paymentAmount: 12000
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.session.outcome, 'PAYMENT_COLLECTED');
    assert.strictEqual(res.body.session.paymentAmount, 12000);
  });

  await t.test('9a. Ending without a proof photo is rejected', async () => {
    const res = await request(app)
      .post('/api/v1/recovery/sessions/' + activeSessionId + '/end')
      .set('Authorization', 'Bearer ' + authToken)
      .send({ outcome: 'PAYMENT_COLLECTED', paymentAmount: 12000, visitNotes: 'Paid in cash.' });

    assert.strictEqual(res.status, 400);
    assert.match(res.body.message, /photo/i);
  });

  await t.test('9b. Upload proof photo', async () => {
    const res = await request(app)
      .post('/api/v1/recovery/sessions/' + activeSessionId + '/evidence')
      .set('Authorization', 'Bearer ' + authToken)
      .attach('photo', Buffer.from('fake-image-bytes'), 'proof.jpg');

    assert.strictEqual(res.status, 201);
  });

  await t.test('9c. Ending with no payment and no remarks is rejected', async () => {
    const res = await request(app)
      .post('/api/v1/recovery/sessions/' + activeSessionId + '/end')
      .set('Authorization', 'Bearer ' + authToken)
      .send({ outcome: 'CUSTOMER_UNAVAILABLE', paymentAmount: 0, visitNotes: '' });

    assert.strictEqual(res.status, 400);
    assert.match(res.body.message, /remarks/i);
  });

  await t.test('10. End Recovery Session', async () => {
    const res = await request(app)
      .post(`/api/v1/recovery/sessions/${activeSessionId}/end`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        outcome: 'PAYMENT_COLLECTED',
        visitNotes: 'Customer cleared overdue installment successfully.',
        paymentAmount: 12000,
        distanceMeters: 1450,
        durationSeconds: 900
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.session.status, 'COMPLETED');
  });

  await t.test('11. Submit Recovery Report', async () => {
    const res = await request(app)
      .post('/api/v1/reports/submit')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        sessionId: activeSessionId,
        outcome: 'PAYMENT_COLLECTED',
        visitNotes: 'Customer cleared overdue installment successfully.',
        paymentAmount: 12000,
        durationSeconds: 900,
        distanceMeters: 1450
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.report.reportId);
    assert.strictEqual(res.body.report.customerName, 'Vikramaditya Roy');
  });

  await t.test('12. Retrieve Recovery History & Reports', async () => {
    const res = await request(app)
      .get('/api/v1/reports/history')
      .set('Authorization', `Bearer ${authToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.reports.length >= 1);
  });

  await t.test('13. Retrieve Dashboard Stats & Monthly Analytics', async () => {
    const statsRes = await request(app)
      .get('/api/v1/analytics/dashboard')
      .set('Authorization', `Bearer ${authToken}`);

    assert.strictEqual(statsRes.status, 200);
    assert.ok(statsRes.body.stats.totalAssigned > 0);
    assert.ok(statsRes.body.stats.totalRecoveredAmount >= 12000);

    const monthlyRes = await request(app)
      .get('/api/v1/analytics/monthly')
      .set('Authorization', `Bearer ${authToken}`);

    assert.strictEqual(monthlyRes.status, 200);
    assert.ok(monthlyRes.body.summary.month);
    assert.ok(monthlyRes.body.summary.outcomeBreakdown);
  });

  await t.test('14. Algorithmic Stop Detection & Distance Computation', () => {
    const points = [
      { latitude: 12.9716, longitude: 77.5946, timestamp: '2026-10-29T10:00:00Z' },
      { latitude: 12.97162, longitude: 77.59461, timestamp: '2026-10-29T10:01:00Z' },
      { latitude: 12.97164, longitude: 77.59463, timestamp: '2026-10-29T10:03:00Z' }, // 3 min dwell at same spot
      { latitude: 12.9800, longitude: 77.6000, timestamp: '2026-10-29T10:15:00Z' } // moved away
    ];

    const stops = detectStopsFromPoints(points, { radiusMeters: 50, minDwellSeconds: 120 });
    assert.strictEqual(stops.length, 1);
    assert.strictEqual(stops[0].durationSeconds, 180);

    const dist = calculateTotalDistance(points);
    assert.ok(dist > 500); // More than 500 meters moved to point 4
  });
});
