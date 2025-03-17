import NodeCache from "node-cache";

const cache:NodeCache = new NodeCache({
    stdTTL: 60, 
    checkperiod:120,
    useClones: false,
    deleteOnExpire: true

});
cache.on("expired", (key, value) => {
    console.log(`Key ${key} expired`);
    console.log(value);
  }
);

export default cache;