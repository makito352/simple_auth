/**
 * @file 共通のローディング表示コンポーネント
 * @description ページ全体の読み込み中を示すスピナーを表示するコンポーネントです。
 *              Tailwind CSSを使用してスタイリングされています。
 */

/**
 * 共通のローディング表示コンポーネント
 */
export const LoadingSpinner = () => (
    <div className="flex justify-center items-center min-h-[100vh] bg-gray-50">
        <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-600 font-medium">読み込み中...</p>
        </div>
    </div>
);