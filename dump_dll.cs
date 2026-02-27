using System;
using System.Reflection;
using System.IO;

class Program
{
    static void Main()
    {
        try
        {
            Assembly asm = Assembly.LoadFrom(@"c:\Users\Mark Lorenz\Desktop\rostra\inspiration_repo\RED MC\Parsers.dll");
            Console.WriteLine("Loaded Assembly: " + asm.FullName);
            
            Type[] types = asm.GetExportedTypes();
            foreach(Type t in types) {
                if(t.Name.Contains("Shoe") || t.Name.Contains("Gear") || t.Name.Contains("Player") || t.Name.Contains("Field")) {
                    Console.WriteLine("Type: " + t.FullName);
                }
            }
        }
        catch(Exception ex)
        {
            Console.WriteLine(ex.Message);
        }
    }
}
