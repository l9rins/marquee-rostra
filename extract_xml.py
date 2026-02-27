import xml.etree.ElementTree as ET
import sys

def extract_text(xml_path):
    try:
        tree = ET.parse(xml_path)
        root = tree.getroot()
        text = []
        # Find all w:t elements
        for elem in root.iter():
            if elem.tag.endswith('t') and elem.text:
                text.append(elem.text)
        print("\n".join(text))
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        extract_text(sys.argv[1])
