
import React from 'react';
import { TabModal, TableModal } from './modals/StructureModals';
import ColumnConfigModal from './modals/ColumnConfigModal';
import ModalWrapper from '../modals/ModalWrapper';

interface EmployeeAnalysisModalsProps {
    modalState: any;
    setModalState: (state: any) => void;
    handleSaveTab: (tabName: string, icon: string, tabId?: string) => void;
    handleSaveTable: (tableName: string, defaultSortColumnId?: string) => void;
    handleSaveColumn: (column: any) => void;
    handleDeleteTab: () => void;
    handleDeleteTable: () => void;
    handleConfirmDeleteColumn: () => void;
    allIndustries: string[];
    allSubgroups: string[];
    allManufacturers: string[];
    currentTableForColumns: any;
}

const EmployeeAnalysisModals: React.FC<EmployeeAnalysisModalsProps> = ({
    modalState,
    setModalState,
    handleSaveTab,
    handleSaveTable,
    handleSaveColumn,
    handleDeleteTab,
    handleDeleteTable,
    handleConfirmDeleteColumn,
    allIndustries,
    allSubgroups,
    allManufacturers,
    currentTableForColumns
}) => {
    return (
        <>
            <TabModal
                isOpen={modalState.type === 'CREATE_TAB' || modalState.type === 'EDIT_TAB'}
                onClose={() => setModalState({type: null})}
                onSave={handleSaveTab}
                tabId={modalState.data?.tabId}
                initialName={modalState.data?.initialName}
                initialIcon={modalState.data?.initialIcon}
            />

            <TableModal
                isOpen={modalState.type === 'CREATE_TABLE' || modalState.type === 'EDIT_TABLE'}
                onClose={() => setModalState({ type: null })}
                onSave={handleSaveTable}
                initialName={modalState.data?.tableName || ''}
                isEditing={modalState.type === 'EDIT_TABLE'}
                columns={modalState.data?.columns}
                initialSortColumnId={modalState.data?.initialSortColumnId}
            />

            {(modalState.type === 'CREATE_COLUMN' || modalState.type === 'EDIT_COLUMN') && currentTableForColumns && (
                <ColumnConfigModal
                    isOpen={true}
                    onClose={() => setModalState({ type: null })}
                    onSave={handleSaveColumn}
                    allIndustries={allIndustries}
                    allSubgroups={allSubgroups}
                    allManufacturers={allManufacturers}
                    existingColumns={currentTableForColumns.columns}
                    editingColumn={modalState.data?.editingColumn}
                />
            )}

            <ModalWrapper
                isOpen={modalState.type === 'CONFIRM_DELETE_TAB'}
                onClose={() => setModalState({ type: null })}
                title="Xác nhận Xóa Tab"
                subTitle={`Bạn sắp xóa tab "${modalState.data?.tabName || ''}"`}
                titleColorClass="text-red-600 dark:text-red-400"
                maxWidthClass="max-w-md"
            >
                <div className="p-6">
                    <p>Hành động này không thể hoàn tác. Toàn bộ các bảng thi đua bên trong tab này cũng sẽ bị xóa vĩnh viễn.</p>
                </div>
                <div className="p-4 flex justify-end gap-3 bg-slate-100 dark:bg-slate-800 rounded-b-xl border-t border-slate-200 dark:border-slate-700">
                    <button onClick={() => setModalState({ type: null })} className="py-2 px-4 rounded-lg shadow-sm text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 transition-colors">Hủy</button>
                    <button onClick={handleDeleteTab} className="py-2 px-6 rounded-lg shadow-sm text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors">Xác nhận Xóa</button>
                </div>
            </ModalWrapper>
            
            <ModalWrapper
                isOpen={modalState.type === 'CONFIRM_DELETE_TABLE'}
                onClose={() => setModalState({ type: null })}
                title="Xác nhận Xóa Bảng"
                subTitle={`Bạn sắp xóa bảng "${modalState.data?.tableName || ''}"`}
                titleColorClass="text-red-600 dark:text-red-400"
                maxWidthClass="max-w-md"
            >
                <div className="p-6">
                    <p>Hành động này sẽ xóa vĩnh viễn bảng thi đua này. Bạn có chắc chắn muốn tiếp tục?</p>
                </div>
                <div className="p-4 flex justify-end gap-3 bg-slate-100 dark:bg-slate-800 rounded-b-xl border-t border-slate-200 dark:border-slate-700">
                    <button onClick={() => setModalState({ type: null })} className="py-2 px-4 rounded-lg shadow-sm text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 transition-colors">Hủy</button>
                    <button onClick={handleDeleteTable} className="py-2 px-6 rounded-lg shadow-sm text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors">Xác nhận Xóa</button>
                </div>
            </ModalWrapper>

            <ModalWrapper
                isOpen={modalState.type === 'CONFIRM_DELETE_COLUMN'}
                onClose={() => setModalState({ type: null })}
                title="Xác nhận Xóa Cột"
                subTitle={`Bạn sắp xóa cột "${modalState.data?.columnName || ''}"`}
                titleColorClass="text-red-600 dark:text-red-400"
                maxWidthClass="max-w-md"
            >
                <div className="p-6">
                    <p>Hành động này sẽ xóa vĩnh viễn cột này khỏi bảng. Bạn có chắc chắn muốn tiếp tục?</p>
                </div>
                <div className="p-4 flex justify-end gap-3 bg-slate-100 dark:bg-slate-800 rounded-b-xl border-t border-slate-200 dark:border-slate-700">
                    <button onClick={() => setModalState({ type: null })} className="py-2 px-4 rounded-lg shadow-sm text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 transition-colors">Hủy</button>
                    <button onClick={handleConfirmDeleteColumn} className="py-2 px-6 rounded-lg shadow-sm text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors">Xác nhận Xóa</button>
                </div>
            </ModalWrapper>
        </>
    );
};

export default EmployeeAnalysisModals;
