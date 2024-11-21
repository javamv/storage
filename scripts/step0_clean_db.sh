#!/bin/bash

# MongoDB connection details
MONGO_HOST="localhost"
MONGO_PORT="37017"
DB_NAME="storage"

# Connect to MongoDB and delete all collections
echo "Connecting to MongoDB at $MONGO_HOST:$MONGO_PORT..."

# Use mongosh to list all collections and delete them
mongosh "mongodb://$MONGO_HOST:$MONGO_PORT/$DB_NAME" --eval "
  const collections = db.getCollectionNames();
  collections.forEach(function(collection) {
    print('Dropping collection: ' + collection);
    db[collection].drop();
  });
"
