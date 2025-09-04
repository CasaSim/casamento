import { Workbook } from 'exceljs';
import { saveAs } from 'file-saver';

interface ExportOptions {
  fileName?: string;
  sheetName?: string;
  headers?: string[];
  styles?: {
    headerFontColor?: string;
    headerBgColor?: string;
    dateFormat?: string;
  };
}

const useExcelExport = () => {
    // eslint-disable-next-line
  const exportToExcel = async (data: any[], options: ExportOptions = {}) => {
    const {
      fileName = 'export',
      sheetName = 'Sheet1',
      headers = [],
      styles = {
        headerFontColor: 'FFFFFFFF',
        headerBgColor: 'FF4472C4',
        dateFormat: 'dd/mm/yyyy'
      }
    } = options;

    if (!data || data.length === 0) {
      throw new Error('Nenhum dado para exportar');
    }

    try {
      const workbook = new Workbook();
      const worksheet = workbook.addWorksheet(sheetName);

      // Usar headers personalizados ou keys do primeiro item
      const columnHeaders = headers.length > 0 
        ? headers 
        : Object.keys(data[0]);

      // Adicionar cabeçalho
      worksheet.addRow(columnHeaders);

      // Aplicar estilos ao cabeçalho
      const headerRow = worksheet.getRow(1);
      headerRow.font = { 
        bold: true, 
        color: { argb: styles.headerFontColor } 
      };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: styles.headerBgColor }
      };

      // Adicionar dados
      data.forEach((item) => {
        const rowData = columnHeaders.map(header => item[header]);
        worksheet.addRow(rowData);
      });

      // Configurar colunas
      worksheet.columns = columnHeaders.map(header => ({
        header,
        key: header,
        width: Math.max(header.length * 1.5, 12)
      }));

      // Adicionar auto-filtro
      worksheet.autoFilter = {
        from: 'A1',
        to: `${String.fromCharCode(64 + columnHeaders.length)}1`
      };

      // Gerar e salvar arquivo
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      saveAs(blob, `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`);
      
      return { success: true, fileName: `${fileName}.xlsx` };
    } catch (error) {
      console.error('Erro na exportação:', error);
      throw new Error('Falha ao exportar para Excel');
    }
  };

  return { exportToExcel };
};

export default useExcelExport;