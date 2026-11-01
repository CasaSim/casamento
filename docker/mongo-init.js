// Runs only when initializing a new data volume.
const appDb = db.getSiblingDB('casamento');
appDb.createUser({
  user: process.env.MONGO_APP_USER,
  pwd: process.env.MONGO_APP_PASSWORD,
  roles: [{ role: 'readWrite', db: 'casamento' }],
});
