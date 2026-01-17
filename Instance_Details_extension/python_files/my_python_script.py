import sys
import json
import struct
import re
import requests

def read_message():
    raw_length = sys.stdin.buffer.read(4)
    if len(raw_length) == 0:
        return None
    message_length = struct.unpack("<I", raw_length)[0]
    message = sys.stdin.buffer.read(message_length).decode("utf-8")
    return json.loads(message)


def send_message(message_obj):
    encoded_message = json.dumps(message_obj).encode("utf-8")
    sys.stdout.buffer.write(struct.pack("<I", len(encoded_message)))
    sys.stdout.buffer.write(encoded_message)
    sys.stdout.buffer.flush()

def parse_instance_from_url(url: str) -> str | None:
    if not url:
        return None
    match = re.search(r"https?://([^./]+).*?\.([^./]+)\.com", url)
    if not match or match.group(2).lower() != "metricstream":
        return None
    return match.group(1)

def get_instance_data(instance, instance_url="http://instances.rnd.metricstream.com:3000/instances/"):
    response = requests.get(instance_url + instance, timeout=5)
    response.raise_for_status()
    payload = response.json()
    rows = payload.get("rows") or []
    first_row = rows[0]
    details_map = first_row[4]
    instance_details = {
        "instance": {
            instance: {
                "db": details_map.get("DB").split(":"),
                "ssh": details_map.get("SSH").split(":"),
            }
        },
        "payload": payload.get("rows"),
    }
    return instance_details

def main():
    while True:
        data = read_message()
        if data is None:
            break
        url = data.get("url", "")
        instance = parse_instance_from_url(url)
        if not instance:
            send_message({"error": "Invalid MetricStream URL", "url": url})
            continue
        try:
            instance_output = get_instance_data(instance)
        except (requests.RequestException, ValueError, KeyError) as exc:
            send_message({"error": str(exc), "instance": instance})
            continue
        send_message(instance_output)


if __name__ == "__main__":
    main()
