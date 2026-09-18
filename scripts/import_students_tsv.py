#!/usr/bin/env python3
import csv
import json
import re
import sys
import unicodedata
import urllib.error
import urllib.request
import uuid
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "app.js"


def read_config():
    text = APP.read_text(errors="replace")
    url = re.search(r"SUPABASE_URL\s*=\s*AUTH_CONFIG\.supabaseUrl\|\|'([^']+)'", text)
    key = re.search(r"SUPABASE_KEY\s*=\s*AUTH_CONFIG\.supabaseKey\|\|'([^']+)'", text)
    if not url or not key:
        raise SystemExit("Não encontrei SUPABASE_URL/SUPABASE_KEY em app.js")
    return url.group(1), key.group(1)


def request_json(method, url, headers=None, body=None):
    data = None if body is None else json.dumps(body).encode("utf-8")
    req = urllib.request.Request(url, data=data, method=method)
    for k, v in (headers or {}).items():
        req.add_header(k, v)
    if body is not None:
        req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            raw = resp.read().decode("utf-8")
            return json.loads(raw) if raw else None
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"{method} {url} -> HTTP {e.code}: {raw[:800]}")


def safe_request_json(method, url, headers=None, body=None):
    try:
        return request_json(method, url, headers, body), None
    except RuntimeError as err:
        return None, str(err)


def norm_key(value):
    value = value or ""
    value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    return re.sub(r"\s+", " ", value).strip().upper()


def only_digits(value):
    return re.sub(r"\D+", "", value or "")


def up(value):
    return re.sub(r"\s+", " ", (value or "").strip()).upper()


def mask_cpf(value):
    d = only_digits(value)
    return f"{d[:3]}.{d[3:6]}.{d[6:9]}-{d[9:11]}" if len(d) == 11 else up(value)


def mask_cep(value):
    d = only_digits(value)
    return f"{d[:2]}.{d[2:5]}-{d[5:8]}" if len(d) == 8 else up(value)


def mask_phone(value):
    d = only_digits(value)
    if len(d) == 11:
        return f"({d[:2]}){d[2:7]}-{d[7:]}"
    if len(d) == 10:
        return f"({d[:2]}){d[2:6]}-{d[6:]}"
    return up(value)


def br_date(value):
    value = (value or "").strip()
    if not value:
        return ""
    for fmt in ("%m/%d/%Y", "%d/%m/%Y", "%Y-%m-%d"):
        try:
            dt = datetime.strptime(value, fmt)
            return dt.strftime("%d/%m/%Y")
        except ValueError:
            pass
    return value


def iso_date(value):
    value = br_date(value)
    try:
        return datetime.strptime(value, "%d/%m/%Y").strftime("%Y-%m-%d")
    except ValueError:
        return None


def clean_email(value):
    return (value or "").strip().lower()


def row_get(row, key):
    return row.get(key, "").strip()


def build_student(row, code, existing_id=None):
    sid = existing_id or str(uuid.uuid4())
    name = up(row_get(row, "Nome"))
    cpf = mask_cpf(row_get(row, "CPF"))
    rg = up(row_get(row, "RG"))
    birth = br_date(row_get(row, "Data Nascimento"))
    sex = up(row_get(row, "Sexo"))[:1]
    phone = mask_phone(row_get(row, "Telefone"))
    contact_phone = mask_phone(row_get(row, "Telefone Contato"))
    mobile = mask_phone(row_get(row, "Celular"))
    whatsapp = mask_phone(row_get(row, "WhatsApp"))
    email = clean_email(row_get(row, "Email"))
    address_obj = {
        "zip": mask_cep(row_get(row, "CEP")),
        "street": up(row_get(row, "Endereço")),
        "number": up(row_get(row, "Nº")),
        "neighborhood": up(row_get(row, "Bairro")),
        "city": up(row_get(row, "Cidade")),
        "state": up(row_get(row, "Estado")),
    }
    address_line = address_obj["street"]
    resp_address_obj = {
        "zip": mask_cep(row_get(row, "CEP Responsável")),
        "street": up(row_get(row, "Endereço Responsável")),
        "number": up(row_get(row, "Nº Responsável")),
        "neighborhood": up(row_get(row, "Bairro Responsável")),
        "city": up(row_get(row, "Cidade Responsável")),
        "state": up(row_get(row, "Estado Responsável")),
    }
    resp_address_line = resp_address_obj["street"]
    responsible = {
        "name": up(row_get(row, "Responsável")),
        "type": "RESPONSÁVEL FINANCEIRO",
        "rg": up(row_get(row, "RG Responsável")),
        "cpf": mask_cpf(row_get(row, "CPF Responsável")),
        "birthDate": br_date(row_get(row, "Nascimento Responsável")),
        "birth_date": iso_date(row_get(row, "Nascimento Responsável")),
        "sex": up(row_get(row, "Sexo Responsável"))[:1],
        "phone": mask_phone(row_get(row, "Telefone Responsável")),
        "mobile": mask_phone(row_get(row, "Celular Responsável")),
        "whatsapp": mask_phone(row_get(row, "WhatsApp Responsável")),
        "email": clean_email(row_get(row, "Email Responsável")),
        "address": resp_address_line,
        "addressData": resp_address_obj,
        "zip": resp_address_obj["zip"],
        "street": resp_address_obj["street"],
        "number": resp_address_obj["number"],
        "district": resp_address_obj["neighborhood"],
        "neighborhood": resp_address_obj["neighborhood"],
        "city": resp_address_obj["city"],
        "state": resp_address_obj["state"],
        "financial": True,
        "pedagogical": True,
    }
    student = {
        "id": sid,
        "supabaseId": sid,
        "legacyId": sid,
        "code": code,
        "name": name,
        "fullName": name,
        "socialName": "",
        "cpf": cpf,
        "document": cpf,
        "rg": rg,
        "birthDate": birth,
        "birth_date": iso_date(row_get(row, "Data Nascimento")),
        "sex": sex,
        "address": address_line,
        "addressData": address_obj,
        "zip": address_obj["zip"],
        "cep": address_obj["zip"],
        "street": address_obj["street"],
        "endereco": address_obj["street"],
        "number": address_obj["number"],
        "neighborhood": address_obj["neighborhood"],
        "bairro": address_obj["neighborhood"],
        "city": address_obj["city"],
        "cidade": address_obj["city"],
        "state": address_obj["state"],
        "uf": address_obj["state"],
        "phone": phone or contact_phone or mobile or whatsapp,
        "contactPhone": contact_phone,
        "mobile": mobile,
        "whatsapp": whatsapp or mobile or phone,
        "email": email,
        "contact": {"phone": phone, "contactPhone": contact_phone, "mobile": mobile, "whatsapp": whatsapp, "email": email},
        "responsible": responsible["name"],
        "guardian": responsible["name"],
        "responsibleFinancial": responsible,
        "responsibles": [responsible] if responsible["name"] else [],
        "fatherName": "",
        "motherName": "",
        "profession": "",
        "workplace": "",
        "workPhone": "",
        "workSchedule": "",
        "diagnosis": "",
        "observations": "",
        "status": "Ativo",
        "situation": "Ativo",
        "registrationDate": br_date(row_get(row, "Data Cadastro")),
        "createdAt": datetime.utcnow().isoformat() + "Z",
        "updatedAt": datetime.utcnow().isoformat() + "Z",
    }
    return student


def existing_key(data):
    if not isinstance(data, dict):
        data = {}
    cpf = only_digits(data.get("cpf") or data.get("document") or "")
    if cpf:
        return "cpf:" + cpf
    phone = only_digits(data.get("whatsapp") or data.get("phone") or "")
    if phone:
        return "phone:" + phone
    return "name:" + norm_key(data.get("name")) + "|" + (data.get("birthDate") or "")


def student_key_from_row(row):
    cpf = only_digits(row_get(row, "CPF"))
    if cpf:
        return "cpf:" + cpf
    phone = only_digits(row_get(row, "WhatsApp") or row_get(row, "Celular") or row_get(row, "Telefone"))
    if phone:
        return "phone:" + phone
    return "name:" + norm_key(row_get(row, "Nome")) + "|" + br_date(row_get(row, "Data Nascimento"))


def main():
    if len(sys.argv) < 2:
        raise SystemExit("Uso: import_students_tsv.py arquivo.tsv")
    tsv_path = Path(sys.argv[1])
    lines = [l for l in tsv_path.read_text(errors="replace").splitlines() if l.strip()]
    start = next((i for i, l in enumerate(lines) if l.startswith("Nome\t")), None)
    if start is None:
        raise SystemExit("Cabeçalho não encontrado.")
    rows = list(csv.DictReader(lines[start:], delimiter="\t"))
    url, key = read_config()
    login = request_json("POST", f"{url}/auth/v1/token?grant_type=password", {"apikey": key}, {"email": "direcao@purpleidiomas.com.br", "password": "123456"})
    token = login["access_token"]
    user_id = login["user"]["id"]
    headers = {"apikey": key, "Authorization": f"Bearer {token}"}
    existing, students_error = safe_request_json("GET", f"{url}/rest/v1/students?select=id,name,email,phone,status,data", headers)
    using_typed_students = students_error is None
    if not using_typed_students:
        existing = request_json("GET", f"{url}/rest/v1/app_records?kind=eq.student&select=id,data", headers) or []
    existing = existing or []
    by_key = {}
    existing_data_by_key = {}
    max_code = 0
    for item in existing:
        data = item.get("data") or {}
        data.setdefault("id", item.get("id"))
        data.setdefault("name", item.get("name"))
        key_existing = existing_key(data)
        by_key[key_existing] = item.get("id")
        existing_data_by_key[key_existing] = data
        try:
            max_code = max(max_code, int(re.sub(r"\D+", "", str(data.get("code") or "")) or 0))
        except ValueError:
            pass
    students = []
    app_records = []
    created = updated = skipped = 0
    seen = set()
    for row in rows:
        if not row_get(row, "Nome"):
            continue
        keyrow = student_key_from_row(row)
        if keyrow in seen:
            skipped += 1
            continue
        seen.add(keyrow)
        existing_id = by_key.get(keyrow)
        existing_data = existing_data_by_key.get(keyrow) or {}
        if existing_id:
            code = existing_data.get("code") or ""
            updated += 1
        else:
            max_code += 1
            code = f"{max_code:06d}"
            created += 1
        student = build_student(row, code or f"{max_code:06d}", existing_id)
        typed = {
            "id": student["id"],
            "name": student["name"],
            "email": student["email"] or None,
            "phone": student["phone"] or student["whatsapp"] or None,
            "class_id": None,
            "status": "ATIVO",
            "data": student,
        }
        students.append(typed)
        app_records.append({"id": student["id"], "kind": "student", "sector": "all", "owner_id": user_id, "data": student})
    def chunks(seq, n=80):
        for i in range(0, len(seq), n):
            yield seq[i:i+n]
    if using_typed_students:
        for chunk in chunks(students):
            request_json("POST", f"{url}/rest/v1/students?on_conflict=id", {**headers, "Prefer": "resolution=merge-duplicates,return=minimal"}, chunk)
    for chunk in chunks(app_records):
        request_json("POST", f"{url}/rest/v1/app_records?on_conflict=id", {**headers, "Prefer": "resolution=merge-duplicates,return=minimal"}, chunk)
    count = request_json("GET", f"{url}/rest/v1/app_records?kind=eq.student&select=id", headers) or []
    print(json.dumps({
        "created": created,
        "updated": updated,
        "skipped": skipped,
        "storage": "students+app_records" if using_typed_students else "app_records",
        "total_students_records": len(count),
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()
