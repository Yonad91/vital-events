export const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
export const MONGO_URI =
  process.env.MONGO_URI ||
  "mongodb://yonasademu57:OoaPocGmQ5qfty9N@cluster0-shard-00-00.kbbcayn.mongodb.net:27017,cluster0-shard-00-01.kbbcayn.mongodb.net:27017,cluster0-shard-00-02.kbbcayn.mongodb.net:27017/eventsdb?ssl=true&replicaSet=atlas-14b8qh-shard-0&authSource=admin&retryWrites=true&w=majority";
export const PORT = process.env.PORT || 5000;
