require('dotenv').config()
const express = require('express')
const cosmos = require('@azure/cosmos').CosmosClient;
const app = express()
const port = 8080
const multer = require('multer')
const {
  Aborter,
  BlockBlobURL,
  ContainerURL,
  ServiceURL,
  StorageURL,
  SharedKeyCredential,
  uploadStreamToBlockBlob
} = require('@azure/storage-blob');

// https://docs.microsoft.com/en-us/azure/storage/blobs/storage-quickstart-blobs-nodejs-v10
const inMemoryStorage = multer.memoryStorage();
const uploadStrategy = multer({ storage: inMemoryStorage }).single('image');
const getStream = require('into-stream');
const containerName = 'images';

// The next set of constants helps to reveal the intent of file size calculations during upload operations.

const ONE_MEGABYTE = 1024 * 1024;
const uploadOptions = { bufferSize: 4 * ONE_MEGABYTE, maxBuffers: 20 };

// Requests made by the API can be set to time-out after a given interval. The Aborter class is responsible for managing how requests are timed-out and the following constant is used to define timeouts used in this sample.

const ONE_MINUTE = 60 * 1000;

// Account credentials are used to create a pipeline, which is responsible for managing how requests are sent to the REST API. Pipelines are thread-safe and specify logic for retry policies, logging, HTTP response deserialization rules, and more.

// The SharedKeyCredential class is responsible for wrapping storage account credentials to provide them to a request pipeline.

const sharedKeyCredential = new SharedKeyCredential(
  process.env.AZURE_STORAGE_ACCOUNT_NAME,
  process.env.AZURE_STORAGE_ACCOUNT_ACCESS_KEY);

// The StorageURL class is responsible for creating a new pipeline.

const pipeline = StorageURL.newPipeline(sharedKeyCredential);

// The ServiceURL models a URL used in the REST API. Instances of this class allow you to perform actions like list containers and provide context information to generate container URLs.

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

const nosql = new cosmos({
  endpoint: process.env.AZURE_COSMOS_URI, auth: {
    masterKey: process.env.AZURE_COSMOS_PRIMARY_KEY
  }
});

// nosql.database('nac').container('jh').items.readAll().toArrary().then(res => console.log(res.result))

app.get('/images', (req, res) => {

})

app.use(express.static('.'));

app.listen(port, () => console.log(`App is listening on port ${port}!`))