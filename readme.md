# Github Webhook (POC) to protect the main branch and create an issue when a repository is created

## Description
A Github webhook called when a repository is created to : 
* create a JWT token based on the private key file of the Github App `createJwt`
* get the installation id of the current Github App `getInstallationInfo`
* authenticate the application installation to get an API token `authenticate`
* create a default readme on the default branch `main`
* protect the default branch `main`
* create an issue with protection rules added

## What's included / not included
As it is a POC, not all functionalities are taken into account.

Working scenario :
* the project created is empty
* there is an only Github Application installed on the organization
* there is only a repository creation webhook configured

Not working scenario : 
* the project created is not empty (contains a branch, when created with a `git push` or with `Add a README file` option on the UI)
* no Github Application installed on the organization
* other webhooks configured

## Declare the Github App
__/!\ If you don't have a known DNS, you need to deploy your application first without the secret an environment variable parts to get your application URL. Cf `How to run on GCP ?`__
* Declare the application with your deployed application URL
* Install the application on your organization
* Create a private key and dowload the `private.pem` file
* Get your application id

## How to run on GCP ?
### GCP Prerequisites
* You need a GCP project
* You need to enable :
    * CloudRun API
    * CloudBuild API
    * ArtifactRegistry API
    * SecretManager API
* You need to create a secret containing your private key with 
```
gcloud secrets create githubapppem
gcloud secrets versions add githubapppem --data-file="private.pem"
```

### How to deploy manually ?
* You need to deploy your application on CloudRun with : 
```
npm install
gcloud run deploy github-technicalexercise --source . --region=europe-west1 --allow-unauthenticated --update-secrets=/etc/secrets/private.pem=githubapppem:latest --update-env-vars APP_ID=<YOUR-APP_ID>
```

## Webhook configuration
* Configure your webhook to capture only repository creation

### Continuous deployment with Github Action
You'll find a Github Action here `.github/workflow/deploy-cloud-run.yml`. You need to :
* create a service account with the rights to deploy a CloudRun
* create a key for this service account
* create a Github secret `GITUHBACTIONSA` with the email of the service account
* create a Github secret `GITUHBACTIONSAKEY` with the key of the service account
* create a Github secret `GCPPROJECTID` with the GPC project id
* create a Github secret `GITHUBAPPID` with the Github App id

## How to run locally ?
You must have the application private key file (`private.pem`) at this location : `/etc/secrets/private.pem`
```
npm install
APP_ID=<YOUR-APP_ID> node index.js 
```
You can now test your app wit curl : 
```
curl -X POST http://localhost:9090 -d '{"repository":{"name":"your-repository-name","owner":{"login":"your-owner-or-organization"}}}' --header 'Content-Type: application/json'
```

## Permissions
https://docs.github.com/en/rest/overview/permissions-required-for-github-apps#permission-on-administration

__TODO__ jeton en dur pour authent github
__TODO__ secret app dans github et push dans gcp dans github action