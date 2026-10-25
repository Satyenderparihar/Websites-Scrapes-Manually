import openpyxl
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

fpath = r'C:\Users\satyanarayan verma\Downloads\All In One Programming Resources.xlsx'
wb = openpyxl.load_workbook(fpath, data_only=True)
wb_f = openpyxl.load_workbook(fpath, data_only=False)

for sname in wb.sheetnames:
    ws = wb[sname]
    ws_f = wb_f[sname]
    print("=" * 60)
    print(f"SHEET: {sname} ({ws.max_row} rows, {ws.max_column} cols)")
    print("=" * 60)
    
    # print first 5 rows with non-empty values
    non_empty_count = 0
    for r in range(1, min(15, ws.max_row + 1)):
        row_vals = [ws.cell(r, c).value for c in range(1, min(10, ws.max_column + 1))]
        row_hl = [ws.cell(r, c).hyperlink.target if ws.cell(r, c).hyperlink else None for c in range(1, min(10, ws.max_column + 1))]
        if any(row_vals) or any(row_hl):
            print(f"Row {r:2d}: vals={row_vals[:6]}")
            if any(row_hl):
                print(f"        hl  ={row_hl[:6]}")
