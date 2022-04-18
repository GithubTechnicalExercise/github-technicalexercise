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
* the project created is empty and public
* there is an only Github Application installed on the organization
* there is only a repository creation webhook configured

Not working scenario : 
* the project created is not empty (contains a branch, when created with a `git push` or with `Add a README file` option on the UI) or no public
* no Github Application installed on the organization
* other webhooks configured

## Declare the Github App
__/!\ If you don't have a known DNS, you need to deploy your application first without the secret and environment variable parts to get your application URL. Cf `How to run on GCP ?`__
* Declare the application on your organization as a GitHub App with following informations : 
    * Name : TechnicalExercise
    * Homepage URL : your GCP cloud run application URL
    * Permissions : Repository permissions/Administration ; Repository permissions/Contents ; Repository permissions/Issues
* Get your application id
* Create a private key and dowload the as `private.pem` file
* Install the application on your organization

## How to run on GCP ?
### GCP Prerequisites
* You need a GCP project
* You need to enable :
    * CloudRun API
    * CloudBuild API
    * ArtifactRegistry API
    * SecretManager API
* Your default compute service account must be granted the 'Secret Manager Secret Accessor' role
* You need to create a secret containing your private key with 
```
gcloud secrets create githubapppem
gcloud secrets versions add githubapppem --data-file="private.pem"

gcloud secrets create REQUEST_SECRET
echo -n "<YOUR-SECRET-TEXT>" | gcloud secrets versions add REQUEST_SECRET --data-file=-
```

### How to deploy manually ?
* You need to deploy your application on CloudRun with : 
```
npm install
gcloud run deploy github-technicalexercise --source . --region=europe-west1 --allow-unauthenticated --update-secrets=/etc/secrets/private.pem=githubapppem:latest --update-secrets=REQUEST_SECRET=REQUEST_SECRET:latest --update-env-vars APP_ID=<YOUR-APP_ID>
```

## Webhook configuration
* Configure a webhook to capture only repository creation with following informations : 
    * Payload URL : your GCP cloud run application URL
    * Content type : application/json
    * Secret : the secret text stored as "REQUEST_SECRET" in GCP secrets
    * Choose : `Let me select individual events` and check `Repositories`

### Continuous deployment with Github Action
You'll find a Github Action here `.github/workflow/deploy-cloud-run.yml`. You need to :
* create a GCP service account with the rights to deploy a CloudRun
* create a key for this GCP service account
* create a Github secret `GITUHBACTIONSA` with the email of the service account
* create a Github secret `GITUHBACTIONSAKEY` with the key of the service account
* create a Github secret `GCPPROJECTID` with the GPC project id
* create a Github secret `GITHUBAPPID` with the Github App id

## How to run locally ?
You must have the application private key file (`private.pem`) at this location : `/etc/secrets/private.pem`
```
npm install
APP_ID=<YOUR-APP_ID> REQUEST_SECRET="abcde12345" node index.js 
```
Generate your request signature : 
```
echo -n '{"repository":{"name":"your-repository-name","owner":{"login":"your-owner-or-organization"}}}' | openssl dgst -hex -sha256 -hmac "<YOUR-SECRET-TEXT>"
```
You can now test your app wit curl : 
```
curl -X POST http://localhost:9090 -d '{"repository":{"name":"your-repository-name","owner":{"login":"your-owner-or-organization"}}}' --header 'Content-Type: application/json' --header 'X-Hub-Signature-256: sha256=<YOUR-REQUEST-SIGNATURE>'
```

## Next
As this is a POC, not everything is done. Must be done : 
* Unit tests
* Integration test
* Complete CICD (Unit tests, integration tests, security compliance, code quality, github app creation, github app installation, secret generation, ...)
* As the default version of the API may change, specify a specific version in the Accept header to ensure the stability of the application

## Usefull links
https://docs.github.com/en/rest/overview/permissions-required-for-github-apps
https://docs.github.com/en/enterprise-server@3.4/developers/apps/managing-github-apps/installing-github-apps
https://docs.github.com/en/developers/apps/building-github-apps/authenticating-with-github-apps
https://docs.github.com/en/developers/apps/building-github-apps/creating-a-github-app
https://docs.github.com/en/developers/webhooks-and-events/webhooks/about-webhooks
https://docs.github.com/en/rest
https://docs.github.com/en/rest/overview/endpoints-available-for-github-apps
https://docs.github.com/en/developers/webhooks-and-events/webhooks/securing-your-webhooks 
