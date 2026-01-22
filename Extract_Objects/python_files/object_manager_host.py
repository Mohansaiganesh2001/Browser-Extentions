import sys, json, struct, os, subprocess

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(SCRIPT_DIR)
CONFIG_FILE = os.path.join(ROOT_DIR, "config.properties")

def load_config():
    config = {}
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    config[key.strip()] = value.strip()
    return config

CONFIG = load_config()
DATA_FILE = CONFIG.get('data_file', os.path.join(ROOT_DIR, 'Modified_object_list.txt'))
VALID_OBJECTS = [x.strip() for x in CONFIG.get('valid_objects', '').split(',')]
NULL_OBJECTS = [x.strip() for x in CONFIG.get('null_objects', '').split(',')]
PARAM_FILE = CONFIG.get('param_file', '')
EXTRACT_FILE = CONFIG.get('param_extract', '')
GIT_CLEAN_FILE = CONFIG.get('git_clean_bat', '')

def read_message():
    raw_length = sys.stdin.buffer.read(4)
    if not raw_length:
        return None
    length = struct.unpack("<I", raw_length)[0]
    return json.loads(sys.stdin.buffer.read(length).decode("utf-8"))

def send_message(msg):
    encoded = json.dumps(msg).encode("utf-8")
    sys.stdout.buffer.write(struct.pack("<I", len(encoded)))
    sys.stdout.buffer.write(encoded)
    sys.stdout.buffer.flush()

def load_data():
    objects = []
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'r') as f:
            for line in f:
                parts = line.strip().split('~')
                if len(parts) >= 2:
                    objects.append({
                        "object_name": parts[0],
                        "object": parts[1],
                        "delimiter": parts[2] if len(parts) > 2 else "None"
                    })
    return objects

def save_data(objects):
    with open(DATA_FILE, 'w') as f:
        for obj in objects:
            if obj["object_name"] in NULL_OBJECTS:
                f.write(f"{obj['object_name']}~{obj['object']}~Null\n")
            else:
                f.write(f"{obj['object_name']}~{obj['object']}\n")

def get_config():
    return {"status": "success", "valid_objects": VALID_OBJECTS, "null_objects": NULL_OBJECTS}

def get_all():
    return {"status": "success", "data": load_data()}

def add(obj_type, obj_name):
    if obj_type not in VALID_OBJECTS:
        return {"status": "error", "message": "Invalid object type"}
    objects = load_data()
    for obj in objects:
        if obj["object_name"] == obj_type and obj["object"] == obj_name:
            return {"status": "error", "message": "Object already exists"}
    objects.append({"object_name": obj_type, "object": obj_name, "delimiter": "None"})
    save_data(objects)
    return {"status": "success", "message": f"Object '{obj_name}' added"}

def delete(obj_name):
    objects = load_data()
    new_objects = [obj for obj in objects if obj["object"] != obj_name]
    if len(new_objects) == len(objects):
        return {"status": "error", "message": "Object not found"}
    save_data(new_objects)
    return {"status": "success", "message": f"Object '{obj_name}' deleted"}

def clear_all():
    save_data([])
    return {"status": "success", "message": "All objects cleared"}

def get_params():
    params = {}
    if os.path.exists(PARAM_FILE):
        with open(PARAM_FILE, 'r') as f:
            for line in f:
                line = line.strip()
                if line.lower().startswith('set ') and '=' in line:
                    parts = line[4:].split('=', 1)
                    key = parts[0].strip()
                    value = parts[1].strip()
                    if value or key not in params:
                        params[key] = value
    return {"status": "success", "params": params}

def save_params(params):
    KEYS = ['Customer', 'MODULE_NAME', 'OBJECT_LIST', 'WORKSPACE_PATH', 'INSTANCE_NAME', 'PULL_DEPENDENT_OBJECT']
    lines = open(PARAM_FILE, 'r').readlines() if os.path.exists(PARAM_FILE) else []
    result, updated = [], set()
    
    for line in lines:
        s = line.strip()
        if s.lower().startswith('set ') and '=' in s:
            key_in_line = s[4:].split('=')[0].strip()
            if key_in_line in KEYS:
                result.append(f"SET {key_in_line}={params.get(key_in_line, '')}\n")
                updated.add(key_in_line)
                continue
        result.append(line if line.endswith('\n') else line + '\n')
    
    for k in KEYS:
        if k not in updated:
            result.append(f"SET {k}={params.get(k, '')}\n")
    
    open(PARAM_FILE, 'w').writelines(result)
    return {"status": "success", "message": "Parameters saved"}

def run_extract():
    if not os.path.exists(EXTRACT_FILE):
        return {"status": "error", "message": "Extract file not found"}
    try:
        subprocess.Popen(EXTRACT_FILE, shell=True, cwd=os.path.dirname(EXTRACT_FILE))
        return {"status": "success", "message": "Extract started"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

def run_git_clean():
    if not os.path.exists(GIT_CLEAN_FILE):
        return {"status": "error", "message": "GIT Clean file not found"}
    try:
        subprocess.Popen(GIT_CLEAN_FILE, shell=True, cwd=os.path.dirname(GIT_CLEAN_FILE))
        return {"status": "success", "message": "GIT Clean started"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

def main():
    while True:
        msg = read_message()
        if msg is None:
            break
        action = msg.get("action")
        try:
            if action == "get_config":
                response = get_config()
            elif action == "get_all":
                response = get_all()
            elif action == "add":
                response = add(msg.get("object_type"), msg.get("object_name"))
            elif action == "delete":
                response = delete(msg.get("object_name"))
            elif action == "clear_all":
                response = clear_all()
            elif action == "get_params":
                response = get_params()
            elif action == "save_params":
                response = save_params(msg.get("params", {}))
            elif action == "run_extract":
                response = run_extract()
            elif action == "run_git_clean":
                response = run_git_clean()
            else:
                response = {"status": "error", "message": "Unknown action"}
        except Exception as e:
            response = {"status": "error", "message": str(e)}
        send_message(response)

if __name__ == "__main__":
    main()
