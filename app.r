# R Code
library(shiny)
library(plotly)
library(tidyverse)
library(crosstalk)
library(DT)

# Class definition equivalent
load_data <- function() {
  infile <- "OCED_simplified.csv"
  read_csv(infile)
}

get_uniques <- function(data, columns = FALSE) {
  if (!columns) {
    sort(unique(data$country))
  } else {
    names(data)[3:ncol(data)]
  }
}

# UI
ui <- navbarPage("Health Care Utilisation Dataset",
  tabPanel("Countries",
    sidebarLayout(
      sidebarPanel(
        selectizeInput("which_countries", "Select Country/Countries", choices = get_uniques(load_data()), multiple = TRUE)
      ),
      mainPanel(
        plotlyOutput("show_map"),
        textOutput("countries_text")
      )
    )
  ),
  # Additional tabs for Years, Variables, Table, Graph, etc.
)

# Server
server <- function(input, output, session) {
  data_instance <- load_data()
  
  output$show_map <- renderPlotly({
    req(input$which_countries)
    filtered_data <- data_instance %>%
      filter(country %in% input$which_countries)
    # Example Plotly map
    plot_ly(filtered_data, x = ~longitude, y = ~latitude, type = 'scatter', mode = 'markers')
  })
  
  output$countries_text <- renderText({
    paste("Number of countries:", length(input$which_countries))
  })
  
  # Additional server logic for other tabs
}

shinyApp(ui, server)