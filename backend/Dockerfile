FROM python:3.10.14-slim AS base

# Define build arguments
ARG AppEnvironment
ARG BuildNumber
ARG BuildId
ARG BuildUser

# Set environment variables using build arguments
ENV AppEnvironment=${AppEnvironment}
ENV BuildNumber=${BuildNumber}
ENV BuildId=${BuildId}
ENV BuildUser=${BuildUser}
ENV PYTHONPATH="${PYTHONPATH}:/code"

WORKDIR /

RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        gnupg \
        build-essential \
        libpq-dev \
        unixodbc \
        unixodbc-dev; \
    curl -fsSL https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor -o /usr/share/keyrings/microsoft-prod.gpg; \
    . /etc/os-release; \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/microsoft-prod.gpg] https://packages.microsoft.com/debian/${VERSION_ID}/prod ${VERSION_CODENAME} main" > /etc/apt/sources.list.d/mssql-release.list; \
    apt-get update; \
    ODBC_PACKAGE="msodbcsql18"; \
    if ! apt-cache show "${ODBC_PACKAGE}" >/dev/null 2>&1; then \
        ODBC_PACKAGE="msodbcsql17"; \
    fi; \
    ACCEPT_EULA=Y apt-get install -y --no-install-recommends "${ODBC_PACKAGE}"; \
    if [ "${ODBC_PACKAGE}" = "msodbcsql18" ]; then \
        ODBC18_PATH="$(ls /opt/microsoft/msodbcsql18/lib64/libmsodbcsql-*.so | head -n 1)"; \
        if ! grep -q "^\[ODBC Driver 17 for SQL Server\]$" /etc/odbcinst.ini; then \
            printf "\n[ODBC Driver 17 for SQL Server]\nDescription=Compatibility alias to ODBC Driver 18 for SQL Server\nDriver=%s\nUsageCount=1\n" "${ODBC18_PATH}" >> /etc/odbcinst.ini; \
        fi; \
    fi; \
    apt-get clean; \
    rm -rf /var/lib/apt/lists/*

RUN apt-get -y update && \
    apt-get install -y --no-install-recommends ffmpeg libsm6 libxext6 && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /code/app

COPY backend/app /code/app

RUN pip install --no-cache-dir --upgrade -r /code/app/requirements.txt

EXPOSE 80

FROM base AS dev
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "80", "--reload"]

FROM base AS prod
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "80"]