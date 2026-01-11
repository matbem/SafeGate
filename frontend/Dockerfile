FROM node:18-alpine

WORKDIR /app

COPY package.json ./

RUN npm install

COPY . .    #Copy the code

EXPOSE 3000 #Expose the port the app runs on

CMD ["npm", "run", "dev", "--","--host", "0.0.0.0", "--port", "3000"] #Start the app in development mode with host binding