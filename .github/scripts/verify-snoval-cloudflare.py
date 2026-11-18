"""Read-only checks using the deployment environment's credentials."""
import json
import os
import sys
import urllib.error
import urllib.request


def main():
    token = os.environ.get('CLOUDFLARE_API_TOKEN', '')
    account = os.environ.get('CLOUDFLARE_ACCOUNT_ID', '')
    if not token or account != '272625e57166b55e5a1fb6de355dbc8e':
        sys.exit('Missing deployment token or incorrect Snoval account ID.')

    def get(path):
        request = urllib.request.Request(
            'https://api.cloudflare.com/client/v4' + path,
            headers={'Authorization': 'Bearer ' + token, 'Accept': 'application/json'},
            method='GET',
        )
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                body = json.load(response)
        except urllib.error.HTTPError as error:
            sys.exit(f'Cloudflare GET {path}: HTTP {error.code}; no changes made.')
        except (urllib.error.URLError, TimeoutError, ValueError):
            sys.exit(f'Cloudflare GET {path}: connection or response error; no changes made.')
        if not body.get('success'):
            sys.exit(f'Cloudflare GET {path} was unsuccessful; no changes made.')
        return body['result']

    # Account-owned tokens have the cfat_ prefix; do not retry permission denials
    # against a different authorization endpoint.
    verification = f'/accounts/{account}/tokens/verify' if token.startswith('cfat_') else '/user/tokens/verify'
    if get(verification).get('status') != 'active':
        sys.exit('Deployment token is not active; no changes made.')
    versions = get(f'/accounts/{account}/workers/scripts/snoval-study/versions')
    if not versions.get('items'):
        sys.exit('No existing snoval-study versions were visible; refusing a new Worker deployment.')
    print('Deployment token is active and can read existing snoval-study versions.')
    print('This read-only check does not prove write access; publishing verifies that separately.')


if __name__ == '__main__':
    main()
