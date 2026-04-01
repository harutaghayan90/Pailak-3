import AiChat from "@/components/ai";
import ToDoList from "@/components/to_do";


export default function Home() {
  return (
    <div className="pageMain">
      <AiChat />
      <ToDoList />
    </div>
  );
}
