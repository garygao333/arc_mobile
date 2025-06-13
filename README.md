# ARC: Archaeological Recording and Classification
A New Way to Record and Digitize Archaeological Artifacts

ARC is an archaeological data recording platform that does two main things. 

First, it provides an easy, fast, and non-invasive way to automate parts of the recording and classification processes. This then allows specialists to focus on interesting and unique sherds and ask bigger questions without being bogged down by manually entering sherds into databases when they already know what the classification is just based on one quick look. 

In another way, it supports the digitization of archaeological data. With the image that is taken to record the data, the individual sherds are all entered into a central database in a uniform format, which is a digital image, location, weight estimation, volume estimation, general classifications and features, and the associated project. Additional information and presentation can be configured by the researchers, but all this data is pushed onto the database for the potential of data reuse so that it is in a uniform format, thereby making the data comparative and digital. 

## Setup 

Here's how to set up the application after opening on VS Code. 

### Backend 

Navigate to backend directory and start the local server through FastAPI. 
```
cd inference-backend
uvicorn inference_server:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

First, install dependencies. 
```
npm install
```
Then, run the program. 
```
npx expo start -c
```
