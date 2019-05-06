require('dotenv').config()
const express = require('express')
const cosmos = require('@azure/cosmos').CosmosClient;
const app = express()
const port = 8080
const multer  = require('multer')
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
  process.env.AZURE_STORAGE_ACCOUNT_NAME,
  process.env.AZURE_STORAGE_ACCOUNT_ACCESS_KEY);
const pipeline = StorageURL.newPipeline(sharedKeyCredential);
const serviceURL = new ServiceURL(
  `https://${process.env.AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net`,
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