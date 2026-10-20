export default function Modals({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4">
      <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6 relative animate-fadeIn">
        {/* Modal Header */}
        <div className="flex justify-between items-center mb-4 border-b pb-3">
          <h3 className="text-lg font-bold text-gray-800">{title}</h3>
          <button
            type="button"
            aria-label="Close dialog"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 font-bold text-xl leading-none"
          >
            &times;
          </button>
        </div>

        {/* Modal Body / Content */}
        <div>{children}</div>
      </div>
    </div>
  );
}
