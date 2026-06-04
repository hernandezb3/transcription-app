#!/usr/bin/env bash
set -euo pipefail

usage() {
	echo "Usage:"
	echo "  bash backend/local_deploy.sh -v key=value [-v key=value ...]"
	echo
	echo "Required keys:"
	echo "  registry_url, username, image_name, build_number, build_id, build_user"
	echo
	echo "Optional keys:"
	echo "  app_environment (default: public)"
	echo "  build_platform (example: linux/amd64)"
	echo "  registry_password (if omitted, REGISTRY_PASSWORD env var is used, then prompt)"
	echo
	echo "Example:"
	echo "  bash backend/local_deploy.sh \\"
	echo "    -v registry_url=registry.example.com \\"
	echo "    -v username=my-user \\"
	echo "    -v image_name=transcription-app \\"
	echo "    -v build_number=42 \\"
	echo "    -v build_id=1001 \\"
	echo "    -v build_user=bryan \\"
	echo "    -v build_platform=linux/amd64 \\"
	echo "    -v registry_password=super-secret \\"
	echo "    -v app_environment=public"
}

REGISTRY_URL=""
REGISTRY_USERNAME=""
IMAGE_NAME=""
BUILD_NUMBER=""
BUILD_ID=""
BUILD_USER=""
APP_ENVIRONMENT="public"
BUILD_PLATFORM=""
REGISTRY_PASSWORD="${REGISTRY_PASSWORD:-}"

set_var() {
	local raw_key="$1"
	local value="$2"
	local key
	key="$(printf '%s' "$raw_key" | tr '[:upper:]' '[:lower:]')"

	key="${key//./_}"
	key="${key//-/_}"

	case "$key" in
	registry_url | url)
		REGISTRY_URL="$value"
		;;
	username | registry_username | registry_user)
		REGISTRY_USERNAME="$value"
		;;
	registry_password | password)
		REGISTRY_PASSWORD="$value"
		;;
	image_name | image)
		IMAGE_NAME="$value"
		;;
	build_number | run_number)
		BUILD_NUMBER="$value"
		;;
	build_id | run_id)
		BUILD_ID="$value"
		;;
	build_user | actor)
		BUILD_USER="$value"
		;;
	app_environment | environment)
		APP_ENVIRONMENT="$value"
		;;
	build_platform | platform)
		BUILD_PLATFORM="$value"
		;;
	*)
		echo "Unknown variable key: $raw_key"
		usage
		exit 1
		;;
	esac
}

if [ "$#" -eq 0 ]; then
	usage
	exit 1
fi

while [ "$#" -gt 0 ]; do
	case "$1" in
	-v | --var)
		if [ "$#" -lt 2 ]; then
			echo "Missing key=value after $1"
			usage
			exit 1
		fi

		if [[ "$2" != *=* ]]; then
			echo "Expected key=value after $1, got: $2"
			usage
			exit 1
		fi

		set_var "${2%%=*}" "${2#*=}"
		shift 2
		;;
	-h | --help)
		usage
		exit 0
		;;
	*)
		echo "Unknown argument: $1"
		usage
		exit 1
		;;
	esac
done

missing=()
[ -z "$REGISTRY_URL" ] && missing+=("registry_url")
[ -z "$REGISTRY_USERNAME" ] && missing+=("username")
[ -z "$IMAGE_NAME" ] && missing+=("image_name")
[ -z "$BUILD_NUMBER" ] && missing+=("build_number")
[ -z "$BUILD_ID" ] && missing+=("build_id")
[ -z "$BUILD_USER" ] && missing+=("build_user")

if [ "${#missing[@]}" -gt 0 ]; then
	echo "Missing required keys: ${missing[*]}"
	usage
	exit 1
fi

if [ -z "${REGISTRY_PASSWORD:-}" ]; then
	read -r -s -p "Registry password: " REGISTRY_PASSWORD
	echo
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
IMAGE_TAG="${REGISTRY_URL}/project-focus/${IMAGE_NAME}:api"

BUILD_PLATFORM_ARGS=()
if [ -n "${BUILD_PLATFORM}" ]; then
	BUILD_PLATFORM_ARGS=(--platform "${BUILD_PLATFORM}")
fi

echo "${REGISTRY_PASSWORD}" | podman login -u "${REGISTRY_USERNAME}" --password-stdin "${REGISTRY_URL}"

podman build \
	"${BUILD_PLATFORM_ARGS[@]}" \
	-f "${SCRIPT_DIR}/Dockerfile" \
	--target prod \
	-t "${IMAGE_TAG}" \
	--build-arg AppEnvironment="${APP_ENVIRONMENT}" \
	--build-arg BuildNumber="${BUILD_NUMBER}" \
	--build-arg BuildId="${BUILD_ID}" \
	--build-arg BuildUser="${BUILD_USER}" \
	"${REPO_ROOT}"

podman push "${IMAGE_TAG}"
