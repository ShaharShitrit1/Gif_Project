
#ifndef FUNCTIONS
#define FUNCTIONS

#include <stdio.h>

/*
this function menu with all the options
input: none
output: user chooice
*/
void printMenu(int* chooice);


/*
this function free all the memory and close the program
input: none
output: none
*/
void exitProgram();


/*
this function get from the user if he wants to load a gif or create a new one
input: pointer to a int variabele 
output: none
*/
void newFileOrLoad(int* newOrLoad);

#endif