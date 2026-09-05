# Android Release Signing

Engora uses the permanent Android application ID `com.asfadavissyah.engora`.
Release signing is loaded from `android/key.properties`; the keystore and
properties file are intentionally ignored by Git.

## Required backup

Keep encrypted offline backups of both files below. Losing them can prevent
future updates from being installed over an existing Engora release.

- `android/app/engora-release.jks`
- `android/key.properties`

Do not commit either file or send their contents through chat or email.

## Local release

From `mobile_beta`, build the production bundle with:

```powershell
flutter build appbundle --release --dart-define=API_BASE_URL=https://api.202-10-37-3.sslip.io
```

The output is `build/app/outputs/bundle/release/app-release.aab`.

## GitHub Actions secrets

Configure these repository secrets before requesting a signed AAB from CI:

- `ANDROID_KEYSTORE_BASE64`: base64 representation of `engora-release.jks`
- `ANDROID_KEYSTORE_PASSWORD`: value of `storePassword`
- `ANDROID_KEY_PASSWORD`: value of `keyPassword`
- `ANDROID_KEY_ALIAS`: `engora-release`

On PowerShell, obtain the base64 value without modifying the keystore:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("android/app/engora-release.jks"))
```

The workflow only creates and uploads an AAB when all signing secrets are
available. Split APK artifacts continue to support internal device testing.
