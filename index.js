const express = require('express');
const https    = require('https');
const crypto = require('crypto');
const app = express();
const jwt = require('jsonwebtoken');
const fs = require('fs');

app.use(express.urlencoded());
app.use(express.json());

const defaultBranch = "main";
const githubAPIUrl = "api.github.com";
const githubAPIPort = "443";
const appId = process.env.APP_ID; //"190391";

app.post('/', (req, res) => {
    let repository = req.body.repository.name;
    let owner = req.body.repository.owner.login;

    let jwtToken = createJwt();

    let headers = {};
    headers['Content-Type'] = 'application/json';
    headers['Authorization'] = `Bearer ${jwtToken}`;
    headers['user-agent'] = 'nodejs';
    return getInstallationInfo(jwtToken).then((installations) => {
        let installationId = JSON.parse(installations)[0].id;
        authenticate(jwtToken, installationId).then((auth) => {
            let appToken = JSON.parse(auth).token;
            createReadme(appToken, owner, repository)
                .then(resultReadme => {
                    console.log(`ResultReadme : ${resultReadme}`);
                    protectDefaultBranch(appToken, owner, repository)
                        .then(resultProtect => {
                            console.log(`ResultProtect : ${resultProtect}`);
                            createIssue(appToken, owner, repository, resultProtect)
                                .then(resultIssue => {
                                    console.log(`ResultIssue : ${resultIssue}`);
                                    res.send(`Main branch created with empty readme and protected, issue created`);
                                })
                                .catch( error => {
                                    console.log(`Error CreateIssue : ${error}`);
                                    res.status(500);
                                    res.send(error);
                                })
                        })
                        .catch( error => {
                            console.log(`Error CreateProtection : ${error}`);
                            res.status(500);
                            res.send(error);
                        })
                })
                .catch( error => {
                    console.log(`Error CreateReadme : ${error}`);
                    res.status(500);
                    res.send(error);
                })
        })
        .catch( error => {
            console.log(`Error Authent : ${error}`);
            res.status(500);
            res.send(error);
        })
    }).catch((error)=> {
        console.log(`Error Install : ${error}`);
        res.status(500);
        res.send(error);
    })
    
    
    
});

app.get('/', (req, res) => {
    res.send("Home Page");
});

const port = parseInt(process.env.PORT) || 9090;
app.listen(port, () => {
  console.log(`helloworld: listening on port ${port}`);
});

function createIssue(appToken, owner, repository, protection) {
    let path = `/repos/${owner}/${repository}/issues`;
    let method = 'POST';
    let headers = {};
    headers['Content-Type'] = 'application/json';
    headers['Authorization'] = `token ${appToken}`;
    headers['user-agent'] = 'nodejs';

    let body = {
        owner: `${owner}`,
        repo: `${repository}`,
        title: "[Auto] Main Branch Protection",
        body: `${protection}`,
        assignees: [
            'sparlant'
        ]
    };

    return callGithubAPI(path, method, headers, body);
}

function protectDefaultBranch(appToken, owner, repository) {
    let path = `/repos/${owner}/${repository}/branches/${defaultBranch}/protection`;
    let method = 'PUT';
    let headers = {};
    headers['Content-Type'] = 'application/json';
    headers['Authorization'] = `token ${appToken}`;
    headers['user-agent'] = 'nodejs';

    let body = {
        required_status_checks: {
            strict: true,
            "contexts": ["continuous-integration/travis-ci"]
        },
        enforce_admins: null,
        required_pull_request_reviews: null,
        restrictions: null
    };

    return callGithubAPI(path, method, headers, body);
}

function createReadme(appToken, owner, repository) {
    let path = `/repos/${owner}/${repository}/contents/readme.md`;
    let method = 'PUT';
    let headers = {};
    headers['Content-Type'] = 'application/json';
    headers['Authorization'] = `token ${appToken}`;
    headers['user-agent'] = 'nodejs';

    let body = {
        owner: `${owner}`,
        repo: `${repository}`,
        path: "readme.md",
        message: "Initial Commit",
        branch: `${defaultBranch}`,
        committer: {
            name: "Sandra Parlant",
            email: "sandra.parlant@gmail.com"
        },
        content: "RGVmYXVsdCBSZWFkbWU="
    };

    return callGithubAPI(path, method, headers, body);
}

function authenticate(jwtToken, installationId) {
    let path = `/app/installations/${installationId}/access_tokens`;
    let method = 'POST';
    let headers = {};
    headers['Content-Type'] = 'application/json';
    headers['Authorization'] = `Bearer ${jwtToken}`;
    headers['user-agent'] = 'nodejs';

    let body = {
        permissions: {
            administration: "write",
            contents: "write"
        }
    }

    return callGithubAPI(path, method, headers, body);
}

function getInstallationInfo(jwtToken) {
    let path = `/app/installations`;
    let method = 'GET';
    let headers = {};
    headers['Content-Type'] = 'application/json';
    headers['Authorization'] = `Bearer ${jwtToken}`;
    headers['user-agent'] = 'nodejs';

    return callGithubAPI(path, method, headers, "");
}

function callGithubAPI(path, method, headers, body) {
    return new Promise((resolve, reject) => {
        dataResult = "";

        const options = {
            hostname: `${githubAPIUrl}`,
            port: `${githubAPIPort}`,
            path: `${path}`,
            method: `${method}`
        }

        let req = https.request(options, (res) => {
            if (res.statusCode < 200 || res.statusCode > 299) {
                res.on('data', (d) => {
                    dataResult += d;
                })
                res.on('end', () => {
                    reject(dataResult);
                })
            } else {
                res.on('data', (d) => {
                    dataResult += d;
                })
                res.on('end', () => {
                    resolve(dataResult);
                })
            }
        })

        let data = body;

        for(key in headers) {
            req.setHeader(key, headers[key]);
        }

        req.write(JSON.stringify(data));
        req.end();
    });
}

function createJwt() {
    let payload = {
        iat: Math.floor(Date.now()/1000)-60,
        exp: Math.floor(Date.now()/1000) + (10 * 60),
        iss: appId
    }

    var privateKey = fs.readFileSync('/etc/secrets/private.pem');
    var token = jwt.sign(payload, privateKey, { algorithm: 'RS256' });

    return token;
}