# ralph-loop — 自律ループ実行

完了条件を満たすまで Claude を自動ループさせる。複雑なタスクを放置で完了させる手法。

```
/ralph-loop "プロンプト" --max-iterations 10 --completion-promise "完了キーワード"
/cancel-ralph        # ループをキャンセル
/ralph-loop:help     # ヘルプ表示
```
