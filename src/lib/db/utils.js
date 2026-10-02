/**
 * MongoDB Utilities and Helpers
 * Common database operations and utilities
 */

import mongoose from 'mongoose';
import connectDB from './mongodb';

/**
 * Validate MongoDB ObjectId
 */
export function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

/**
 * Convert string ID to ObjectId
 */
export function toObjectId(id) {
  return new mongoose.Types.ObjectId(id);
}

/**
 * Safe database query wrapper with error handling
 */
export async function safeQuery(queryFn) {
  try {
    await connectDB();
    return await queryFn();
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

/**
 * Pagination helper
 */
export function getPagination(page = 1, limit = 10) {
  const skip = (page - 1) * limit;
  return { skip, limit };
}

/**
 * Sort parser for API queries
 * Format: "field1:asc,field2:desc"
 */
export function parseSortQuery(sortString) {
  if (!sortString) return { createdAt: -1 };
  
  const sortObj = {};
  sortString.split(',').forEach((item) => {
    const [field, direction] = item.split(':');
    sortObj[field] = direction === 'asc' ? 1 : -1;
  });
  return sortObj;
}

/**
 * Filter parser for API queries
 * Format: { status: 'OPEN', role: 'FARMER' }
 */
export function buildFilterQuery(filters = {}) {
  const query = {};
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query[key] = value;
    }
  });
  
  return query;
}

/**
 * Transaction wrapper for multi-operation queries
 */
export async function runTransaction(transactionFn) {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const result = await transactionFn(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

/**
 * Database connection status checker
 */
export function getConnectionStatus() {
  const state = mongoose.connection.readyState;
  const states = {
    0: 'Disconnected',
    1: 'Connected',
    2: 'Connecting',
    3: 'Disconnecting',
  };
  return states[state] || 'Unknown';
}

/**
 * Bulk write operations helper
 */
export async function bulkWrite(Model, operations) {
  try {
    const result = await Model.collection.bulkWrite(operations);
    return result;
  } catch (error) {
    console.error('Bulk write error:', error);
    throw error;
  }
}

/**
 * Create text index for search
 */
export async function createTextIndex(Model, fields) {
  try {
    const indexSpec = {};
    fields.forEach((field) => {
      indexSpec[field] = 'text';
    });
    await Model.collection.createIndex(indexSpec);
  } catch (error) {
    console.error('Text index creation error:', error);
  }
}

/**
 * Search with text index
 */
export async function textSearch(Model, searchTerm, options = {}) {
  try {
    const query = {
      $text: { $search: searchTerm },
    };
    
    return await Model.find(query, { score: { $meta: 'textScore' } })
      .sort({ score: { $meta: 'textScore' } })
      .limit(options.limit || 10)
      .skip(options.skip || 0);
  } catch (error) {
    console.error('Text search error:', error);
    return [];
  }
}

/**
 * Aggregate with error handling
 */
export async function aggregateData(Model, pipeline) {
  try {
    return await Model.aggregate(pipeline);
  } catch (error) {
    console.error('Aggregation error:', error);
    throw error;
  }
}

/**
 * Clean up old documents (for archiving/cleanup)
 */
export async function deleteOldDocuments(Model, olderThanDays = 30) {
  try {
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    const result = await Model.deleteMany({
      createdAt: { $lt: cutoffDate },
    });
    return result;
  } catch (error) {
    console.error('Cleanup error:', error);
    throw error;
  }
}

/**
 * Export data to structured format
 */
export async function exportData(Model, query = {}, fields = null) {
  try {
    let queryBuilder = Model.find(query);
    
    if (fields) {
      queryBuilder = queryBuilder.select(fields);
    }
    
    return await queryBuilder.lean();
  } catch (error) {
    console.error('Export error:', error);
    throw error;
  }
}

/**
 * Validate unique field before creating document
 */
export async function checkUnique(Model, field, value) {
  try {
    const exists = await Model.findOne({ [field]: value });
    return !exists;
  } catch (error) {
    console.error('Unique check error:', error);
    throw error;
  }
}

/**
 * Get database statistics
 */
export async function getDatabaseStats() {
  try {
    return await mongoose.connection.db.stats();
  } catch (error) {
    console.error('Stats error:', error);
    return null;
  }
}

/**
 * Disconnect from database
 */
export async function disconnectDB() {
  try {
    await mongoose.disconnect();
    console.log('✓ Disconnected from MongoDB');
  } catch (error) {
    console.error('Disconnect error:', error);
  }
}
