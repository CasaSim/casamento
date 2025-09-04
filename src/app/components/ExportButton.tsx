'use client';

import React from 'react';
import { Workbook } from 'exceljs';
import { saveAs } from 'file-saver';

interface ExportButtonProps {
  data: any[];
  fileName?: string;
  sheetName?: string;
  className?: string;
  disabled?: boolean;
}

const ExportButton: React.FC<ExportButtonProps> = ({
  data,
  fileName = 'dashboard',
  sheetName = 'Gastos',
  className = 'bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors',
  disabled = false
}) => {
  const exportToExcel = async () => {
    if (!data || data.length === 0 || disabled) {
      alert('Nenhum dado para exportar');
      return;
    }

    try {
      // Criar uma nova workbook
      const workbook = new Workbook();
      
      // Adicionar worksheet
      const worksheet = workbook.addWorksheet(sheetName);
      
      // Adicionar cabeçalhos
      const headers = Object.keys(data[0]);
      worksheet.addRow(headers);
      
      // Estilizar cabeçalho
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' }
      };
      
      // Adicionar dados
      data.forEach((item) => {
        const rowData = headers.map(header => item[header]);
        worksheet.addRow(rowData);
      });
      
      // Auto-filtro
      worksheet.autoFilter = {
        from: 'A1',
        to: `${String.fromCharCode(64 + headers.length)}1`
      };
      
      // Ajustar largura das colunas
      worksheet.columns = headers.map(header => ({
        header,
        key: header,
        width: 20
      }));
      
      // Gerar buffer
      const buffer = await workbook.xlsx.writeBuffer();
      
      // Criar blob e salvar
      const blob = new Blob([buffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      saveAs(blob, `${fileName}.xlsx`);
      
      console.log('Arquivo exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar para Excel:', error);
      alert('Erro ao exportar o arquivo');
    }
  };

  return (
    <button
      onClick={exportToExcel}
      className={className}
      disabled={disabled || !data || data.length === 0}
    >
      📊 Exportar para Excel
    </button>
  );
};

export default ExportButton;