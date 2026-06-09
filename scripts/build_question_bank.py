import json
import re
from pathlib import Path

import pandas as pd


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "2026年供应链知识调考试题汇总表（通识部分）5.22.xlsx"
OUTPUT = ROOT / "questions.mjs"

TYPE_MAP = {
    "单选题": ("single", 1),
    "多选题": ("multiple", 2),
    "判断题": ("judge", 0.5),
}

OPTION_LABELS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"


def clean(value):
    return str(value).strip() if not pd.isna(value) else ""


def clean_option(value):
    return clean(value).replace("；", "").replace(";", "").strip()


def parse_options(raw):
    text = clean(raw)
    if "$;$" in text:
        parts = [clean_option(part) for part in re.split(r";?\$;\$", text)]
    else:
        parts = [clean_option(part) for part in re.split(r"[;；,，、]", text)]
    return [
        {"key": OPTION_LABELS[index], "text": part}
        for index, part in enumerate(parts)
        if part
    ]


def main():
    df = pd.read_excel(SOURCE, sheet_name="Sheet1", header=1).dropna(how="all")
    questions = []

    for _, row in df.iterrows():
        source_type = clean(row["题型"])
        if source_type not in TYPE_MAP:
            continue
        question_type, score = TYPE_MAP[source_type]
        source_id = int(row["序号"])
        questions.append(
            {
                "id": f"q{source_id}",
                "sourceNo": source_id,
                "type": question_type,
                "typeLabel": source_type,
                "stem": clean(row["试题正文"]),
                "options": parse_options(row["试题选项"]),
                "answer": clean(row["试题答案"]).upper().replace(" ", ""),
                "score": score,
            }
        )

    payload = json.dumps(questions, ensure_ascii=False, indent=2)
    OUTPUT.write_text(
        "export const QUESTION_BANK = "
        + payload
        + ";\n\nexport default QUESTION_BANK;\n",
        encoding="utf-8",
    )
    print(f"Wrote {len(questions)} questions to {OUTPUT}")


if __name__ == "__main__":
    main()
