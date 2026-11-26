"""Submit one deduplicated incident to Companion's bound owner-only QQ outbox."""
import os
import json
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from perrin_companion.adapters.storage.authority import Authority
from perrin_companion.configuration import _read_secure_file
from perrin_companion.contracts import Scope
from perrin_companion.domain import stable_id
from perrin_companion.policies import TaskDefinition, TaskOccurrence

MESSAGES = {
    "renewal_failed": "Snoval 刚才没能续上学校登录。服务会继续检查；如果需要重新授权，请在 Snoval 登录后更新服务器上的学校凭据。",
    "login_required": "Snoval 的学校登录已失效，测验和互评暂时无法处理。请重新登录并更新服务器上的学校凭据。",
    "missing_refresh": "Snoval 的学校登录即将到期，但服务器没有续期凭据。请重新登录，并在服务器授权时一并填入 refresh_token。",
}

def queue(store, scope, incident, reason):
    if scope.platform != 'qq' or scope.conversation_id != 'private:' + scope.subject_id:
        raise ValueError('expected bound QQ private owner')
    task = stable_id('task', 'snoval-session-alert', scope.key(), incident)
    occ = stable_id('occurrence', task)
    if store.db.execute('SELECT 1 FROM task_occurrences WHERE id=?', (occ,)).fetchone():
        return
    rev, closed = store.cancellation(scope)
    if closed:
        raise RuntimeError('owner conversation closed')
    source = stable_id('task-source', task)
    store.import_task_source(scope, import_id=source, source_system='snoval-session-alert', external_id=incident, content={'reason': reason})
    now = datetime.now(timezone.utc)
    store.schedule_reminder(scope, TaskDefinition(task, '', 1, provenance_id=source), TaskOccurrence(task, occ, 1, now.isoformat(), (now + timedelta(hours=2)).isoformat()), MESSAGES[reason], expected_cancellation_revision=rev)

def binding():
    owner = json.loads(_read_secure_file(Path(os.environ['SNOVAL_OWNER_CONFIG'])))
    return Scope(**owner['scope']), Path(os.environ['SNOVAL_AUTHORITY_DB'])

if __name__ == '__main__':
    scope, db = binding()
    queue(Authority(db), scope, *sys.argv[1:])
