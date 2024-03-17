# BUZZ BASE テーブルについて

[![Image from Gyazo](https://i.gyazo.com/675a5d6a117b37be94c45cece4db3970.png)](https://gyazo.com/675a5d6a117b37be94c45cece4db3970)

## usersテーブル
| カラム | 型 | 詳細 |
| --- | --- | --- |
| provider | string | ユーザー認証の提供元。今後、メールアドレス認証以外の認証方法を導入予定。 |
| uid | string | 各ユーザーを一意に識別するために使用。 |
| encrypted_password | string | ユーザーのパスワードを暗号化して保存。 |
| reset_password_token | string | パスワードをリセットするプロセスを管理。 |
| reset_password_sent_at | datetime | パスワードリセットトークンが送信された日時。 |
| allow_password_change | boolean | パスワードを変更できる状態であるか。 |
| remember_created_at | datetime | ログイン状態保持の有効期間。 |
| confirmation_token | string | 新規登録時にメールアドレスの確認を行うのトークン。 |
| confirmed_at | datetime | アカウントが確認された日時 |
| confirmation_sent_at | datetime | アカウント確認メールを送信した日時 |