const express = require('express')
const cosmosdb = require('@azure/cosmos').CosmosClient;
const app = express()
const port = 8080
const multer  = require('multer')
const fs = require('fs')
const path = require('path')
const dirPath = path.join(__dirname, "/uploads")
const {
  Aborter,
  BlockBlobURL,
  ContainerURL,
  ServiceURL,
  StorageURL,
  SharedKeyCredential,
  uploadStreamToBlockBlob
} = require('@azure/storage-blob');

const inMemoryStorage = multer.memoryStorage();
const uploadStrategy = multer({ storage: inMemoryStorage }).single('image');
const getStream = require('into-stream');
const containerName = 'images';
const ONE_MEGABYTE = 1024 * 1024;
const uploadOptions = { bufferSize: 4 * ONE_MEGABYTE, maxBuffers: 20 };
const ONE_MINUTE = 60 * 1000;

const sharedKeyCredential = new SharedKeyCredential(
  'wjblobstorage218',
  'UGN5TpJlS6FKkE1a5igO2iKKa1GBb19yDVvo+uGY7r3DPHKPsfKrtpSOGf+dwEcZZ5Wa0qHQp6MMiIyWtgRXdw==');
const pipeline = StorageURL.newPipeline(sharedKeyCredential);
const serviceURL = new ServiceURL(
  `https://wjblobstorage218.blob.core.windows.net`,
  pipeline
);

const getBlobName = originalName => {
  // Use a random number to generate a unique file name, 
  // removing "0." from the start of the string.
  const identifier = Math.random().toString().replace(/0\./, ''); 
  return `${identifier}-${originalName}`;
};

app.post('/profile', uploadStrategy, async (req, res) => {
    const aborter = Aborter.timeout(30 * ONE_MINUTE);
    const blobName = getBlobName(req.file.originalname);
    const stream = getStream(req.file.buffer);
    const containerURL = ContainerURL.fromServiceURL(serviceURL, containerName);
    const blockBlobURL = BlockBlobURL.fromContainerURL(containerURL, blobName);
    
    
    try {
        await uploadStreamToBlockBlob(aborter, stream,
            blockBlobURL, uploadOptions.bufferSize, uploadOptions.maxBuffers);
            res.redirect("/")
            
        } catch (err) {
            res.json(err)

  }
});


const nosql = new cosmos( {endpoint: process.env.AZURE_COSMOS_URI, auth: { 
  masterKey: process.env.AZURE_COSMOS_PRIMARY_KEY
}});

nosql.database('nac').container('jh').items.readAll().toArrary().then(res => console.log(res.result))

app.get('/images', (req, res) => {

})

app.use(express.static('.'));

app.listen(port, () => console.log(`App is listening on port ${port}!`))