import os
import json
import sqlite3
import urllib.request
import ssl

ssl._create_default_https_context = ssl._create_unverified_context

KAIKKI_URL = "https://kaikki.org/dictionary/Spanish/kaikki.org-dictionary-Spanish.jsonl"

KAIKKI_FILE = "kaikki.org-dictionary-Spanish.jsonl"
APP_DB_FILE = "app_dict.db"

def download_file(url, filename):
    if not os.path.exists(filename):
        print(f"Downloading {filename} from {url}...")
        urllib.request.urlretrieve(url, filename)
        print(f"Downloaded {filename}")
    else:
        print(f"{filename} already exists, skipping download.")

def init_app_db(db_path):
    # clear old db
    if os.path.exists(db_path):
        os.remove(db_path)
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute('''
        CREATE TABLE IF NOT EXISTS dictionary (
            word TEXT,
            pos TEXT,
            en_senses TEXT,
            PRIMARY KEY(word, pos)
        )
    ''')
    conn.commit()
    return conn

def extract_en_senses(senses_list):
    res = []
    for sense in senses_list:
        glosses = sense.get("glosses", [])
        if glosses:
            res.append(glosses[0])
    return res

def process_kaikki(conn):
    print("Processing Kaikki dataset...")
    cur = conn.cursor()

    insert_query = '''
        INSERT OR REPLACE INTO dictionary (word, pos, en_senses)
        VALUES (?, ?, ?)
    '''

    batch = {}
    count = 0
    with open(KAIKKI_FILE, 'r', encoding='utf-8') as f:
        for line in f:
            entry = json.loads(line)

            # We only care about Spanish words
            if entry.get("lang") != "Spanish":
                continue

            word = entry.get("word")
            pos = entry.get("pos", "unknown")

            senses = extract_en_senses(entry.get("senses", []))

            key = (word, pos)
            if key not in batch:
                batch[key] = {"senses": []}

            batch[key]["senses"].extend(senses)

            count += 1
            if count % 100000 == 0:
                print(f"Processed {count} records from Kaikki...")

    print(f"Total {count} records parsed. Saving to database...")

    # Prepare batch for insertion
    data_to_insert = []
    for (word, pos), data in batch.items():
        data_to_insert.append((
            word,
            pos,
            json.dumps(list(set(data["senses"])), ensure_ascii=False)
        ))

    cur.executemany(insert_query, data_to_insert)
    conn.commit()
    print(f"Inserted {len(data_to_insert)} unique (word, pos) combinations.")

def main():
    download_file(KAIKKI_URL, KAIKKI_FILE)

    # Create DB
    conn = init_app_db(APP_DB_FILE)

    # Process Kaikki
    process_kaikki(conn)

    conn.close()
    print("Dictionary generation finished! Database saved as:", APP_DB_FILE)

if __name__ == "__main__":
    main()
