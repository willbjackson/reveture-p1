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

// app.post('/profile', upload.single('avatar'), function (req, res) {
//     res.redirect("/")
// })

app.get('/images', (req, res) => {
    fs.readdir(dirPath, (err, files) => {
        if(err) {
            res.send("balls")
        } else {
            res.json(files)
        }
    })
})


const nosql = new cosmosdb({
  endpoint: 'https://project-1.documents.azure.com:443/',
  auth: {
    masterKey: 'u515IkJdYa7T5LOo0WwZ0T85DQEN29Tba58xmC4UdZLRjvyFMYVN9KLupU0x5bM4D8VauyR52NED5AmvLk7OvQ=='
  }
})

app.use(express.static('.'));

app.listen(port, () => console.log(`App is listening on port ${port}!`))