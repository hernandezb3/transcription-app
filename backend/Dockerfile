FROM python:3.10.14-slim

WORKDIR /code/app

COPY app /code/app

# Define build arguments
ARG AppEnvironment
ARG BuildNumber
ARG BuildId
ARG BuildUser

# Set environment variables using build arguments
ENV AppEnvironment=dev
ENV BuildNumber=${BuildNumber}
ENV BuildId=${BuildId}
ENV BuildUser=${BuildUser}

WORKDIR /

RUN apt-get update && \
    apt-get install -y curl && \
    apt-get install -y gnupg && \
    apt-get install -y libpq-dev && \
    apt-get install -y build-essential && \
    curl -k https://packages.microsoft.com/keys/microsoft.asc | tee /etc/apt/trusted.gpg.d/microsoft.asc && \
    echo "deb [arch=amd64,arm64,armhf] https://packages.microsoft.com/debian/12/prod bookworm main" | tee /etc/apt/sources.list.d/mssql-release.list && \
    apt-get update && \
    ACCEPT_EULA=Y apt-get install -y msodbcsql17 && \
    rm -rf /var/lib/apt/lists/* && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

RUN apt-get -y update && \
    apt-get install ffmpeg libsm6 libxext6  -y && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

ENV PYTHONPATH="${PYTHONPATH}:/code/app"
WORKDIR /code/app
RUN pip install --no-cache-dir --upgrade -r /code/app/requirements.txt

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "80", "--reload"]