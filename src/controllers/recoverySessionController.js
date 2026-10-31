const { v4: uuidv4 } = require('uuid');
const RecoverySession = require('../models/RecoverySession');
const TrackingPoint = require('../models/TrackingPoint');
const StopEvent = require('../models/StopEvent');
const Assignment = require('../models/Assignment');
const Evidence = require('../models/Evidence');
const memoryStore = require('../services/store');
const { getIsConnected } = require('../config/db');
const { getDistanceInMeters } = require('../services/stopDetectionService');

exports.startSession = async (req, res) => {
  try {
    const staffId = req.staff._id.toString();
    const { assignmentId, customerId, loanId, initialLocation } = req.body;

    if (!assignmentId) {
      return res.status(400).json({
        success: false,
        message: 'Assignment ID is required to start a recovery session.'
      });
    }

    if (getIsConnected()) {
      // Check for an active session to prevent accidental duplicates
      let activeSession = await RecoverySession.findOne({
        staffId,
        status: 'ACTIVE'
      });

      if (activeSession) {
        return res.status(200).json({
          success: true,
          isExisting: true,
          message: 'Resumed existing active recovery session.',
          session: activeSession
        });
      }

      const sessionId = `SESS-${Date.now()}-${uuidv4().substring(0, 8)}`;
      const newSession = new RecoverySession({
        sessionId,
        staffId,
        assignmentId,
        customerId,
        loanId,
        startTime: new Date(),
        status: 'ACTIVE',
        outcome: 'PENDING'
      });

      await newSession.save();

      // Update assignment status
      await Assignment.findByIdAndUpdate(assignmentId, {
        recoveryStatus: 'IN_PROGRESS',
        lastVisitDate: new Date()
      });

      if (initialLocation && initialLocation.latitude) {
        await TrackingPoint.create({
          sessionId,
          staffId,
          latitude: initialLocation.latitude,
          longitude: initialLocation.longitude,
          accuracy: initialLocation.accuracy || 0,
          timestamp: new Date()
        });
      }

      return res.status(201).json({
        success: true,
        isExisting: false,
        message: 'Recovery session started successfully.',
        session: newSession
      });
    } else {
      // Memory Store fallback
      await memoryStore.initDefaults();
      let activeSession = memoryStore.sessions.find(
        s => s.staffId === staffId && s.status === 'ACTIVE'
      );

      if (activeSession) {
        return res.status(200).json({
          success: true,
          isExisting: true,
          message: 'Resumed existing active recovery session.',
          session: activeSession
        });
      }

      const sessionId = `SESS-${Date.now()}-${uuidv4().substring(0, 8)}`;
      const newSession = {
        _id: `sess_${Date.now()}`,
        sessionId,
        staffId,
        assignmentId,
        customerId,
        loanId,
        startTime: new Date().toISOString(),
        endTime: null,
        durationSeconds: 0,
        distanceMeters: 0,
        status: 'ACTIVE',
        outcome: 'PENDING',
        paymentAmount: 0,
        visitNotes: '',
        isReportSubmitted: false
      };

      memoryStore.sessions.push(newSession);

      // Update assignment
      const asgn = memoryStore.assignments.find(a => a._id === assignmentId || a.assignmentId === assignmentId);
      if (asgn) {
        asgn.recoveryStatus = 'IN_PROGRESS';
        asgn.lastVisitDate = new Date().toISOString();
      }

      if (initialLocation && initialLocation.latitude) {
        memoryStore.trackingPoints.push({
          sessionId,
          staffId,
          latitude: initialLocation.latitude,
          longitude: initialLocation.longitude,
          accuracy: initialLocation.accuracy || 0,
          timestamp: new Date().toISOString()
        });
      }

      return res.status(201).json({
        success: true,
        isExisting: false,
        message: 'Recovery session started successfully.',
        session: newSession
      });
    }
  } catch (error) {
    console.error('Error starting session:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to start recovery session.'
    });
  }
};

exports.getActiveSession = async (req, res) => {
  try {
    const staffId = req.staff._id.toString();

    if (getIsConnected()) {
      const session = await RecoverySession.findOne({
        staffId,
        status: 'ACTIVE'
      });

      if (!session) {
        return res.status(200).json({
          success: true,
          active: false,
          session: null
        });
      }

      const points = await TrackingPoint.find({ sessionId: session.sessionId }).sort({ timestamp: 1 });
      const stops = await StopEvent.find({ sessionId: session.sessionId }).sort({ startTime: 1 });
      const evidences = await Evidence.find({ sessionId: session.sessionId }).sort({ capturedAt: 1 });

      return res.status(200).json({
        success: true,
        active: true,
        session,
        pointsCount: points.length,
        stops,
        evidences
      });
    } else {
      await memoryStore.initDefaults();
      const session = memoryStore.sessions.find(
        s => s.staffId === staffId && s.status === 'ACTIVE'
      );

      if (!session) {
        return res.status(200).json({
          success: true,
          active: false,
          session: null
        });
      }

      const stops = memoryStore.stops.filter(st => st.sessionId === session.sessionId);
      const evidences = memoryStore.evidences.filter(e => e.sessionId === session.sessionId);
      const points = memoryStore.trackingPoints.filter(p => p.sessionId === session.sessionId);

      return res.status(200).json({
        success: true,
        active: true,
        session,
        pointsCount: points.length,
        stops,
        evidences
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve active session.'
    });
  }
};

exports.addTrackingPoints = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { points, incrementalDistanceMeters } = req.body;
    const staffId = req.staff._id.toString();

    if (!points || !Array.isArray(points) || points.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Points array is required.'
      });
    }

    if (getIsConnected()) {
      const docs = points.map(p => ({
        sessionId,
        staffId,
        latitude: p.latitude,
        longitude: p.longitude,
        accuracy: p.accuracy || 0,
        altitude: p.altitude || 0,
        speed: p.speed || 0,
        timestamp: p.timestamp ? new Date(p.timestamp) : new Date()
      }));

      await TrackingPoint.insertMany(docs);

      if (incrementalDistanceMeters && incrementalDistanceMeters > 0) {
        await RecoverySession.findOneAndUpdate(
          { sessionId, staffId },
          { $inc: { distanceMeters: incrementalDistanceMeters } }
        );
      }

      return res.status(200).json({
        success: true,
        message: `${points.length} tracking points recorded.`
      });
    } else {
      points.forEach(p => {
        memoryStore.trackingPoints.push({
          sessionId,
          staffId,
          latitude: p.latitude,
          longitude: p.longitude,
          accuracy: p.accuracy || 0,
          altitude: p.altitude || 0,
          speed: p.speed || 0,
          timestamp: p.timestamp || new Date().toISOString()
        });
      });

      const session = memoryStore.sessions.find(s => s.sessionId === sessionId);
      if (session && incrementalDistanceMeters > 0) {
        session.distanceMeters = (session.distanceMeters || 0) + incrementalDistanceMeters;
      }

      return res.status(200).json({
        success: true,
        message: `${points.length} tracking points recorded.`
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to record tracking points.'
    });
  }
};

exports.recordStop = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const staffId = req.staff._id.toString();
    const {
      stopIndex,
      startTime,
      endTime,
      durationSeconds,
      latitude,
      longitude,
      placeName,
      address,
      dwellType
    } = req.body;

    if (!placeName || !latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Readable place name, latitude, and longitude are required.'
      });
    }

    if (getIsConnected()) {
      const stop = await StopEvent.create({
        sessionId,
        staffId,
        stopIndex: stopIndex || 1,
        startTime: startTime ? new Date(startTime) : new Date(),
        endTime: endTime ? new Date(endTime) : new Date(),
        durationSeconds: durationSeconds || 0,
        latitude,
        longitude,
        placeName,
        address: address || '',
        dwellType: dwellType || 'INTERMEDIATE_STOP'
      });

      return res.status(201).json({
        success: true,
        message: 'Detected stop saved successfully.',
        stop
      });
    } else {
      const stop = {
        _id: `stop_${Date.now()}`,
        sessionId,
        staffId,
        stopIndex: stopIndex || memoryStore.stops.filter(s => s.sessionId === sessionId).length + 1,
        startTime: startTime || new Date().toISOString(),
        endTime: endTime || new Date().toISOString(),
        durationSeconds: durationSeconds || 0,
        latitude,
        longitude,
        placeName,
        address: address || '',
        dwellType: dwellType || 'INTERMEDIATE_STOP'
      };

      memoryStore.stops.push(stop);

      return res.status(201).json({
        success: true,
        message: 'Detected stop saved successfully.',
        stop
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to record stop.'
    });
  }
};

exports.updateSessionOutcome = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const staffId = req.staff._id.toString();
    const { outcome, visitNotes, paymentAmount, promiseDate } = req.body;

    if (getIsConnected()) {
      const session = await RecoverySession.findOneAndUpdate(
        { sessionId, staffId },
        {
          outcome,
          visitNotes,
          paymentAmount: paymentAmount ? Number(paymentAmount) : 0,
          promiseDate: promiseDate ? new Date(promiseDate) : null
        },
        { new: true }
      );

      if (!session) {
        return res.status(404).json({ success: false, message: 'Session not found.' });
      }

      return res.status(200).json({
        success: true,
        message: 'Session outcome updated.',
        session
      });
    } else {
      const session = memoryStore.sessions.find(s => s.sessionId === sessionId && s.staffId === staffId);
      if (!session) {
        return res.status(404).json({ success: false, message: 'Session not found.' });
      }

      if (outcome) session.outcome = outcome;
      if (visitNotes !== undefined) session.visitNotes = visitNotes;
      if (paymentAmount !== undefined) session.paymentAmount = Number(paymentAmount);
      if (promiseDate) session.promiseDate = promiseDate;

      return res.status(200).json({
        success: true,
        message: 'Session outcome updated.',
        session
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update session outcome.'
    });
  }
};

exports.endSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const staffId = req.staff._id.toString();
    const { outcome, visitNotes, paymentAmount, promiseDate, distanceMeters, durationSeconds } = req.body;

    const endTime = new Date();

    if (getIsConnected()) {
      const session = await RecoverySession.findOne({ sessionId, staffId });
      if (!session) {
        return res.status(404).json({ success: false, message: 'Session not found.' });
      }

      const calculatedDuration = durationSeconds || Math.round((endTime.getTime() - new Date(session.startTime).getTime()) / 1000);

      session.endTime = endTime;
      session.status = 'COMPLETED';
      session.durationSeconds = calculatedDuration;
      if (distanceMeters !== undefined) session.distanceMeters = distanceMeters;
      if (outcome) session.outcome = outcome;
      if (visitNotes !== undefined) session.visitNotes = visitNotes;
      if (paymentAmount !== undefined) session.paymentAmount = Number(paymentAmount);
      if (promiseDate) session.promiseDate = new Date(promiseDate);

      await session.save();

      // Update assignment
      await Assignment.findByIdAndUpdate(session.assignmentId, {
        recoveryStatus: outcome || 'COMPLETED',
        notes: visitNotes || '',
        lastVisitDate: endTime
      });

      return res.status(200).json({
        success: true,
        message: 'Recovery session completed successfully.',
        session
      });
    } else {
      const session = memoryStore.sessions.find(s => s.sessionId === sessionId && s.staffId === staffId);
      if (!session) {
        return res.status(404).json({ success: false, message: 'Session not found.' });
      }

      const calculatedDuration = durationSeconds || Math.round((endTime.getTime() - new Date(session.startTime).getTime()) / 1000);

      session.endTime = endTime.toISOString();
      session.status = 'COMPLETED';
      session.durationSeconds = calculatedDuration;
      if (distanceMeters !== undefined) session.distanceMeters = distanceMeters;
      if (outcome) session.outcome = outcome;
      if (visitNotes !== undefined) session.visitNotes = visitNotes;
      if (paymentAmount !== undefined) session.paymentAmount = Number(paymentAmount);
      if (promiseDate) session.promiseDate = promiseDate;

      const asgn = memoryStore.assignments.find(a => a._id === session.assignmentId || a.assignmentId === session.assignmentId);
      if (asgn) {
        asgn.recoveryStatus = outcome || 'COMPLETED';
        asgn.notes = visitNotes || '';
        asgn.lastVisitDate = endTime.toISOString();
      }

      return res.status(200).json({
        success: true,
        message: 'Recovery session completed successfully.',
        session
      });
    }
  } catch (error) {
    console.error('Error ending session:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to end recovery session.'
    });
  }
};
