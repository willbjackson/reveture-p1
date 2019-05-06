#!/bin/bash

groupName=$1
storageAccountName=$2
location=southcentralus
servicePlanName=$3
appName=$4
gitrepo=https://github.com/willbjackson/reveture-p1
cosmosName=$5
cosmosDatabaseName=$6
cosmosContainerName=$7

# Create a resource group.
az group create --location $location --name $groupName

az storage account create \
    --name $storageAccountName \
    --location $location \
    --resource-group $groupName \
    --kind blobstorage \
    --sku Standard_LRS \
    --access-tier hot

blobStorageAccountKey=$(az storage account keys list -g $groupName \
-n $storageAccountName --query [0].value --output tsv)

az storage container create -n images --account-name $storageAccountName \
--account-key $blobStorageAccountKey --public-access off

echo $blobStorageAccountKey


# Create a SQL API Cosmos DB account with session consistency and multi-master enabled.
az cosmosdb create \
    --resource-group $groupName \
    --name $cosmosName \
    --kind GlobalDocumentDB \
    --locations "South Central US"=0 "North Central US"=1 \
    --default-consistency-level "Session" \
    --enable-multiple-write-locations true


# Create a database
az cosmosdb database create \
    --resource-group $groupName \
    --name $cosmosName \
    --db-name $cosmosDatabaseName


# Create a SQL API container with a partition key and 1000 RU/s.
az cosmosdb collection create \
    --resource-group $groupName \
    --collection-name $cosmosContainerName \
    --name $cosmosName \
    --db-name $cosmosDatabaseName \
    --partition-key-path /mypartitionkey \
    --throughput 1000

# Create an App Service 
az appservice plan create --name $servicePlanName --resource-group $groupName --sku B1 --location $location --is-linux

# Create a web app.
az webapp create --resource-group $groupName --plan $servicePlanName --name $appName -r "node|10.14"

az webapp config appsettings set -g $groupName -n $appName --settings AZURE_STORAGE_ACCOUNT_NAME=$appName
az webapp config appsettings set -g $groupName -n $appName --settings AZURE_STORAGE_ACCOUNT_ACCESS_KEY=$blobStorageAccountKey

# Configure continuous deployment from GitHub. 
# --git-token parameter is required only once per Azure account (Azure remembers token).
az webapp deployment source config --name $appName --resource-group $groupName \
--repo-url $gitrepo --branch master

# add instances 
az appservice plan update -g $groupName -n $servicePlanName --number-of-workers 3

primaryKey=$(az cosmosdb list-keys --name willdb218 -g wjgroup218 --query primaryMasterKey -o tsv)

az webapp config appsettings set -g $groupName -n $appName --settings AZURE_COSMOS_URI=https://${cosmosName}.documents.azure.com:443/
az webapp config appsettings set -g $groupName -n $appName --settings AZURE_COSMOS_PRIMARY_KEY=$primaryKey